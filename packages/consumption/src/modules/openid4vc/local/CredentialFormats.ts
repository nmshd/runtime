/* eslint-disable @typescript-eslint/naming-convention -- OpenID4VC and DCQL use standardized field names. */
import { OpenId4VcJsonObject, OpenId4VpResolvedAuthorizationRequest, VerifiableCredential } from "@nmshd/content";
import { Jwk, zJwk } from "@openid4vc/oauth2";
import { CoseKey } from "@owf/cose";
import { DeviceRequest, DocRequest, Holder as MdocHolder, IssuerSigned, ItemsRequest, SessionTranscript } from "@owf/mdoc";
import { SDJwtVcInstance } from "@sd-jwt/sd-jwt-vc";
import { DcqlCredential, DcqlQuery } from "dcql";
import { normalizeCredential, transformPresentationInput, validateCredentialPayload, validateJwtCredentialPayload, validateJwtPresentationPayload } from "did-jwt-vc";
import { base64url, calculateJwkThumbprint, decodeJwt } from "jose";
import { z } from "zod";
import { OpenId4VcCrypto } from "./OpenId4VcCrypto";

type CredentialMatch = Extract<ReturnType<typeof DcqlQuery.query>["credential_matches"][string], { success: true }>["valid_credentials"][number];
interface SdJwtPresentationFrame {
    [claim: string]: boolean | SdJwtPresentationFrame;
}

const jsonObjectSchema = z.record(z.string(), z.json());
const confirmationSchema = z.object({ jwk: zJwk.optional(), kid: z.string().optional() }).optional();
const holderBindingSchema = z.object({ cnf: confirmationSchema, sub: z.string().optional() });
const w3cCredentialSchema = z
    .object({
        "@context": z.union([z.string(), z.array(z.string())]),
        type: z.union([z.string(), z.array(z.string())]),
        credentialSubject: jsonObjectSchema,
        issuer: z.union([z.string(), z.object({ id: z.string() }).catchall(z.json())]).optional(),
        issuanceDate: z.string().optional(),
        expirationDate: z.string().optional(),
        validFrom: z.string().optional(),
        validUntil: z.string().optional()
    })
    .catchall(z.json());

export class CredentialFormats {
    public constructor(
        private readonly cryptography: OpenId4VcCrypto,
        private readonly fetchInstance: typeof fetch
    ) {}

    public sdJwt(holderKey?: Jwk): SDJwtVcInstance {
        return new SDJwtVcInstance({
            hasher: (data, algorithm) => this.cryptography.hash(typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data), algorithm),
            verifier: async (data, signature) => {
                // The SD-JWT library validates claims, including its configured clock skew.
                await this.cryptography.verifyIssuerSignature(`${data}.${signature}`);
                return true;
            },
            kbVerifier: async (data, signature, payload) => await this.cryptography.verifyWithKey(`${data}.${signature}`, await this.holderKey(payload)),
            kbSigner: holderKey ? async (data) => base64url.encode(await this.cryptography.signData(new TextEncoder().encode(data), holderKey)) : undefined,
            kbSignAlg: holderKey ? this.cryptography.algorithm(holderKey) : undefined,
            statusListFetcher: async (uri) => {
                const response = await this.fetchInstance(uri);
                if (!response.ok) throw new Error(`Unable to fetch status list: HTTP ${response.status}`);
                return await response.text();
            },
            statusVerifier: async (data, signature) => {
                try {
                    await this.cryptography.verifyIssuerSignature(`${data}.${signature}`);
                    return true;
                } catch {
                    return false;
                }
            },
            loadTypeMetadataFormat: false
        });
    }

    public async holderKey(payload: unknown): Promise<Jwk> {
        const { cnf: confirmation, sub } = holderBindingSchema.parse(payload);
        if (confirmation?.jwk) {
            const key = this.cryptography.publicKey(confirmation.jwk);
            this.cryptography.algorithm(key);
            return key;
        }
        const did = confirmation?.kid ?? sub;
        if (typeof did === "string" && did.startsWith("did:")) return await this.cryptography.resolveDid(did);
        throw new Error("Credential has no supported holder binding");
    }

    public async decode(credential: VerifiableCredential): Promise<{ dcql: DcqlCredential; holderKey: Jwk }> {
        if (typeof credential.value !== "string") throw new Error("Credential must be encoded as a string");
        switch (credential.type) {
            case "dc+sd-jwt": {
                const result = await this.sdJwt().verify(credential.value, { skewSeconds: 30 });
                const claims = jsonObjectSchema.parse(result.payload);
                const holderKey = await this.holderKey(result.payload);
                await this.cryptography.getPrivateKey(holderKey);
                return {
                    dcql: {
                        credential_format: "dc+sd-jwt",
                        vct: z.string().parse(claims.vct),
                        claims,
                        cryptographic_holder_binding: true
                    },
                    holderKey
                };
            }
            case "jwt_vc_json": {
                const payload = await this.cryptography.verifyIssuerJwt(credential.value);
                const vc = w3cCredentialSchema.parse(payload.vc);
                validateJwtCredentialPayload({ ...payload, vc });
                if (vc.issuer && (typeof vc.issuer === "string" ? vc.issuer : vc.issuer.id) !== payload.iss) throw new Error("W3C credential issuer mismatch");
                const notBefore = vc.validFrom ?? vc.issuanceDate;
                const expires = vc.validUntil ?? vc.expirationDate;
                const normalized = normalizeCredential({ ...payload, vc });
                validateCredentialPayload({ ...normalized, issuanceDate: notBefore ?? normalized.issuanceDate, expirationDate: expires ?? normalized.expirationDate });
                if ((notBefore && Date.parse(notBefore) > Date.now()) || (expires && Date.parse(expires) <= Date.now())) {
                    throw new Error("W3C credential is not valid at the current time");
                }
                const holderKey = await this.holderKey({ ...payload, sub: payload.sub ?? vc.credentialSubject.id });
                await this.cryptography.getPrivateKey(holderKey);
                return {
                    dcql: {
                        credential_format: "jwt_vc_json",
                        type: Array.isArray(vc.type) ? vc.type : [vc.type],
                        claims: jsonObjectSchema.parse(vc),
                        cryptographic_holder_binding: true
                    },
                    holderKey
                };
            }
            case "mso_mdoc": {
                const issuerSigned = IssuerSigned.fromEncodedForOid4Vci(credential.value);
                await MdocHolder.verifyIssuerSigned(
                    { issuerSigned, trustedCertificates: [{ issuance: [issuerSigned.issuerAuth.certificate] }], skewSeconds: 0 },
                    this.cryptography.mdocContext
                );
                const mso = issuerSigned.issuerAuth.mobileSecurityObject;
                const holderKey = this.cryptography.publicKey(mso.deviceKeyInfo.deviceKey.jwk);
                await this.cryptography.getPrivateKey(holderKey);
                if (!issuerSigned.issuerNamespaces) throw new Error("mdoc issuer namespaces are missing");
                const namespaceClaimsSchema = z.record(z.string(), z.unknown());
                const namespaces = Object.fromEntries(
                    [...issuerSigned.issuerNamespaces.issuerNamespaces.keys()].map((namespace) => [
                        namespace,
                        namespaceClaimsSchema.parse(issuerSigned.getPrettyClaims(namespace) ?? {})
                    ])
                );
                return { dcql: { credential_format: "mso_mdoc", doctype: mso.docType, namespaces, cryptographic_holder_binding: true }, holderKey };
            }
            default:
                throw new Error("Unsupported credential format");
        }
    }

    public async assertHolderBinding(credential: VerifiableCredential, expectedKey: Jwk): Promise<void> {
        const decoded = await this.decode(credential);
        if ((await calculateJwkThumbprint(decoded.holderKey)) !== (await calculateJwkThumbprint(expectedKey))) {
            throw new Error("Issued credential does not match the requested holder key");
        }
    }

    private presentationFrame(claims: OpenId4VcJsonObject): SdJwtPresentationFrame {
        return Object.fromEntries(
            Object.entries(claims).map(([key, value]) => [
                key,
                value !== null && typeof value === "object"
                    ? this.presentationFrame(jsonObjectSchema.parse(Array.isArray(value) ? Object.fromEntries(value.entries()) : value))
                    : true
            ])
        );
    }

    public async present(
        credential: VerifiableCredential,
        request: OpenId4VpResolvedAuthorizationRequest,
        match: CredentialMatch,
        encryptionKey?: Jwk,
        mdocGeneratedNonce?: string
    ): Promise<string> {
        const { holderKey } = await this.decode(credential);
        if (typeof credential.value !== "string") throw new Error("Credential must be encoded as a string");
        const encoded = credential.value;
        const payload = request.authorizationRequestPayload;
        const disclosedClaims = match.claims.valid_claim_sets[0].output;
        switch (credential.type) {
            case "dc+sd-jwt":
                return await this.sdJwt(holderKey).present(encoded, this.presentationFrame(jsonObjectSchema.parse(disclosedClaims)), {
                    kb: { payload: { iat: Math.floor(Date.now() / 1000), aud: payload.client_id, nonce: payload.nonce } }
                });
            case "jwt_vc_json": {
                const jwtPayload = decodeJwt(encoded);
                const vc = w3cCredentialSchema.parse(jwtPayload.vc);
                const subject = jwtPayload.sub ?? vc.credentialSubject.id;
                const holderDid = typeof subject === "string" && subject.startsWith("did:") ? subject : this.cryptography.didForKey(holderKey, "jwk").split("#")[0];
                const kid = holderDid.startsWith("did:key:") ? `${holderDid}#${holderDid.slice(8)}` : holderDid.startsWith("did:jwk:") ? `${holderDid}#0` : undefined;
                const presentation = transformPresentationInput({
                    "@context": ["https://www.w3.org/2018/credentials/v1"],
                    type: ["VerifiablePresentation"],
                    holder: holderDid,
                    verifiableCredential: [encoded],
                    aud: payload.client_id,
                    nonce: payload.nonce,
                    iat: Math.floor(Date.now() / 1000)
                });
                validateJwtPresentationPayload(presentation);
                return await this.cryptography.signJwt(presentation, holderKey, kid ? { typ: "JWT", kid } : { typ: "JWT", jwk: holderKey });
            }
            case "mso_mdoc": {
                const issuerSigned = IssuerSigned.fromEncodedForOid4Vci(encoded);
                const namespaceClaims = z.record(z.string(), z.record(z.string(), z.unknown())).parse(disclosedClaims);
                const namespaces = new Map(Object.entries(namespaceClaims).map(([namespace, claims]) => [namespace, new Map(Object.keys(claims).map((claim) => [claim, false]))]));
                if (!payload.response_uri) throw new Error("Presentation response URI is missing");
                const sessionTranscript =
                    request.version >= 100
                        ? await SessionTranscript.forOid4Vp(
                              {
                                  clientId: payload.client_id,
                                  nonce: payload.nonce,
                                  responseUri: payload.response_uri,
                                  jwkThumbprint: encryptionKey ? base64url.decode(await calculateJwkThumbprint(encryptionKey)) : undefined
                              },
                              this.cryptography.mdocContext
                          )
                        : await SessionTranscript.forOid4VpDraft18(
                              {
                                  clientId: payload.client_id,
                                  responseUri: payload.response_uri,
                                  verifierGeneratedNonce: payload.nonce,
                                  mdocGeneratedNonce: z.string().min(1).parse(mdocGeneratedNonce)
                              },
                              this.cryptography.mdocContext
                          );
                const response = await MdocHolder.createDeviceResponseForDeviceRequest(
                    {
                        deviceRequest: DeviceRequest.create({
                            docRequests: [DocRequest.create({ itemsRequest: ItemsRequest.create({ docType: issuerSigned.issuerAuth.mobileSecurityObject.docType, namespaces }) })]
                        }),
                        sessionTranscript,
                        documents: [{ issuerSigned, docRequestIndex: 0, signature: { signingKey: CoseKey.fromJwk({ ...holderKey, alg: this.cryptography.algorithm(holderKey) }) } }]
                    },
                    this.cryptography.mdocContext
                );
                return response.encodedForOid4Vp;
            }
            default:
                throw new Error("Unsupported credential format");
        }
    }
}
