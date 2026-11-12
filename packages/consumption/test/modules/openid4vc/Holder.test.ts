/* eslint-disable @typescript-eslint/naming-convention -- Protocol fixture field names. */
/* eslint-disable @typescript-eslint/require-await -- In-memory fixtures implement asynchronous storage APIs. */
import { vi } from "vitest";
import { ILogger } from "@js-soft/logging-abstractions";
import { GivenName, IdentityAttribute, TokenContentVerifiablePresentation } from "@nmshd/content";
import { CoreAddress, CoreDate, CoreId } from "@nmshd/core-types";
import { AccountController, CoreSynchronizable, ICoreSynchronizable, Identity, SynchronizedCollection } from "@nmshd/transport";
import { Jwk, zJwk } from "@openid4vc/oauth2";
import { CoseKey, SignatureAlgorithm } from "@owf/cose";
import { DeviceKey, DeviceResponse, IssuerSigned, IssuerSignedBuilder, SessionTranscript } from "@owf/mdoc";
import { SubjectAlternativeNameExtension, X509Certificate, X509CertificateGenerator } from "@peculiar/x509";
import { SDJwtVcInstance } from "@sd-jwt/sd-jwt-vc";
import { base64url, compactDecrypt, decodeJwt, decodeProtectedHeader, exportJWK, generateKeyPair, importJWK, JWTPayload, jwtVerify, SignJWT } from "jose";
import { instance, mock } from "ts-mockito";
import { deflateSync } from "node:zlib";
import { ValiError } from "valibot";
import { z } from "zod";
import {
    AttributesController,
    OwnIdentityAttribute,
    OwnIdentityAttributeWithVerifiableCredential,
    OpenId4VcCredentialFormat,
    OpenId4VpResolvedAuthorizationRequest
} from "../../../src";
import { CredentialFormats } from "../../../src/modules/openid4vc/local/CredentialFormats";
import { Holder } from "../../../src/modules/openid4vc/local/Holder";
import { KeyStorage } from "../../../src/modules/openid4vc/local/KeyStorage";
import { OpenId4VcCrypto } from "../../../src/modules/openid4vc/local/OpenId4VcCrypto";

const issuer = "https://issuer.example";
const verifier = "https://verifier.example";
const docType = "org.iso.18013.5.1.mDL";
const namespace = "org.iso.18013.5.1";
const vct = "https://example.com/credentials/holder-test";
const credentialRequestSchema = z.object({ proof: z.never().optional(), proofs: z.object({ jwt: z.array(z.string()).length(1) }) }).loose();
const presentationResponseSchema = z.object({ state: z.string().optional(), vp_token: z.record(z.string(), z.array(z.string())) });

async function importAsymmetricKey(jwk: Jwk, algorithm: string): Promise<CryptoKey> {
    const key = await importJWK(jwk, algorithm);
    if (key instanceof Uint8Array) throw new Error("Expected an asymmetric key");

    return key;
}

class Fixture {
    public readonly requests: { url: string; body?: z.infer<typeof credentialRequestSchema> }[] = [];
    public readonly keyEntries = new Map<string, Record<string, unknown>>();
    public readonly attributes: OwnIdentityAttribute[] = [];
    public readonly account = Object.assign(instance(mock<AccountController>()), {
        identity: Object.assign(instance(mock<Identity>()), { address: CoreAddress.from("id1test") }),
        syncDatawallet: vi.fn(() => Promise.resolve())
    });
    private readonly collection = Object.assign(instance(mock<SynchronizedCollection>()), {
        read: async (id: string) => this.keyEntries.get(id),
        find: async () => Array.from(this.keyEntries.values()),
        create: async (entry: CoreSynchronizable) => this.keyEntries.set(entry.id.toString(), z.record(z.string(), z.unknown()).parse(entry.toJSON())),
        delete: async (entry: ICoreSynchronizable) => this.keyEntries.delete(CoreId.from(entry.id).toString())
    });
    private readonly attributeController = Object.assign(instance(mock<AttributesController>()), {
        getLocalAttributes: async () => this.attributes,
        createOwnIdentityAttribute: async ({ content }: { content: IdentityAttribute }) => {
            const attribute = OwnIdentityAttribute.from({ id: CoreId.from(`ATT${this.attributes.length.toString().padStart(17, "0")}`), createdAt: CoreDate.utc(), content });

            this.attributes.push(attribute);

            return attribute;
        }
    });
    public readonly keyStorage = new KeyStorage(this.collection, instance(mock<ILogger>()));
    public readonly crypto = new OpenId4VcCrypto(this.keyStorage, (...args) => this.fetch(...args));
    public holder = this.restart();
    public presentationVersion = 100;
    public requestClientId = "x509_san_dns:verifier.example";
    public extraResponses = new Map<string, Response>();
    public submittedPlaintext?: string;
    public submittedEncryptionHeader?: Record<string, unknown>;
    public issuerAlgorithm = "ES256";
    public issuerKey: Jwk;
    public issuerPublicKey: Jwk;
    public issuerCertificate: X509Certificate;
    public expiresAt = Math.floor(Date.now() / 1000) + 3600;
    public format: OpenId4VcCredentialFormat = "dc+sd-jwt";
    public algorithm = "ES256";
    public proofAlgorithms?: string[];
    public bindingMethod = "jwk";
    public issuedKey: Jwk;
    public tokenPin?: string;
    public proofNonce = "issuer-nonce";
    public presentationRequest: JWTPayload & { client_id: string; nonce: string };
    public submitted: z.infer<typeof presentationResponseSchema>;
    public accessTokens: string[] = [];
    public encryptionAlgorithm = "ECDH-ES";
    public encryptionKey?: Jwk;
    public encryptionPublicKey?: Jwk;
    public jarmSigningAlgorithm?: string;
    public submittedJarm?: string;
    public credentialResponseOverride?: Record<string, unknown>;
    public credentialResponseStatus = 200;
    public names?: string[];
    public credentialStatus?: { status_list: { uri: string; idx: number } };
    public statusListResponse = new Response("missing", { status: 404 });

    public restart(): Holder {
        return new Holder(new KeyStorage(this.collection, instance(mock<ILogger>())), this.account, this.attributeController, (...args) => this.fetch(...args));
    }

    public async init(): Promise<void> {
        const key = await generateKeyPair(this.issuerAlgorithm, { extractable: true });

        this.issuerKey = zJwk.parse(await exportJWK(key.privateKey));
        this.issuerPublicKey = zJwk.parse(await exportJWK(key.publicKey));
        this.issuerCertificate = await X509CertificateGenerator.createSelfSigned({
            name: "CN=Test Issuer,C=DE",
            serialNumber: "01",
            notBefore: new Date("2020-01-01"),
            notAfter: new Date("2040-01-01"),
            signingAlgorithm: this.issuerAlgorithm === "ES256" ? { name: "ECDSA", hash: "SHA-256" } : { name: "Ed25519" },
            keys: key,
            extensions: [new SubjectAlternativeNameExtension([{ type: "dns", value: "verifier.example" }])]
        });
    }

    private json(value: unknown, status = 200): Response {
        return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
    }

    public async fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
        const url = input.toString();
        const requestBody = init?.body;
        if (requestBody !== undefined && requestBody !== null && typeof requestBody !== "string") throw new Error("Expected a string request body");

        const body = requestBody ? Object.fromEntries(new URLSearchParams(requestBody)) : undefined;

        this.requests.push({ url });
        const extraResponse = this.extraResponses.get(url);
        if (extraResponse) return extraResponse.clone();
        if (url.includes("/.well-known/openid-credential-issuer")) {
            return this.json({
                credential_issuer: issuer,
                credential_endpoint: `${issuer}/credential`,
                nonce_endpoint: `${issuer}/nonce`,
                authorization_servers: [issuer],
                credential_configurations_supported: {
                    test: {
                        format: this.format,
                        vct: this.format === "dc+sd-jwt" ? vct : undefined,
                        doctype: this.format === "mso_mdoc" ? docType : undefined,
                        credential_definition:
                            this.format === "jwt_vc_json"
                                ? { type: ["VerifiableCredential", "TestCredential"], "@context": ["https://www.w3.org/2018/credentials/v1"] }
                                : undefined,
                        cryptographic_binding_methods_supported: [this.bindingMethod],
                        proof_types_supported: { jwt: { proof_signing_alg_values_supported: this.proofAlgorithms ?? [this.algorithm] } },
                        display: [{ name: "Test credential", locale: "en" }],
                        credential_metadata: { display: [{ name: "Test credential", locale: "en" }] }
                    }
                }
            });
        }

        if (url.includes("/.well-known/oauth-authorization-server") || url.includes("/.well-known/openid-configuration")) {
            return this.json({ issuer, token_endpoint: `${issuer}/token`, grant_types_supported: ["urn:ietf:params:oauth:grant-type:pre-authorized_code"] });
        }

        if (url === `${issuer}/offer`) {
            return this.json({
                credential_issuer: issuer,
                credential_configuration_ids: ["test"],
                grants: {
                    "urn:ietf:params:oauth:grant-type:pre-authorized_code": {
                        "pre-authorized_code": "code",
                        tx_code: this.tokenPin ? { input_mode: "numeric", length: 4 } : undefined
                    }
                }
            });
        }

        if (url === `${issuer}/token`) {
            if (this.tokenPin && body?.tx_code !== this.tokenPin) return this.json({ error: "invalid_grant", error_description: "Invalid transaction code" }, 400);

            return this.json({ access_token: "access-token", token_type: "Bearer" });
        }

        if (url === `${issuer}/status`) return this.statusListResponse.clone();
        if (url === `${issuer}/nonce`) return this.json({ c_nonce: this.proofNonce });
        if (url === `${issuer}/credential`) {
            this.accessTokens.push(new Headers(init?.headers).get("authorization")!);
            if (!requestBody) throw new Error("Missing credential request body");

            const request = credentialRequestSchema.parse(JSON.parse(requestBody));

            this.requests[this.requests.length - 1].body = request;

            const proof = request.proofs.jwt[0];
            if (!proof) throw new Error("Missing credential request proof");

            const header = decodeProtectedHeader(proof);
            const publicKey = header.jwk ? this.crypto.publicKey(header.jwk) : await this.crypto.resolveDid(z.string().parse(header.kid));

            this.issuedKey = publicKey;

            const verified = await jwtVerify(proof, await importJWK(publicKey, header.alg), { audience: issuer });
            if (verified.payload.nonce !== this.proofNonce) return this.json({ error: "invalid_proof" }, 400);

            return this.json(
                this.credentialResponseOverride ?? { credentials: [{ credential: await this.issue(publicKey, header.kid?.split("#")[0]) }] },
                this.credentialResponseStatus
            );
        }

        if (url === `${issuer}/.well-known/jwt-vc-issuer`) return this.json({ issuer, jwks_uri: `${issuer}/jwks` });
        if (url === `${verifier}/jwks`) return this.json({ keys: [this.encryptionPublicKey] });
        if (url === `${issuer}/jwks`) return this.json({ keys: [{ ...this.issuerPublicKey, kid: "issuer-key" }] });
        if (url === `${verifier}/request`) {
            return new Response(
                await new SignJWT(this.presentationRequest)
                    .setProtectedHeader({ alg: this.issuerAlgorithm, typ: "oauth-authz-req+jwt", x5c: [base64url.encode(new Uint8Array(this.issuerCertificate.rawData))] })
                    .sign(await importJWK(this.issuerKey, this.issuerAlgorithm)),
                { headers: { "content-type": "application/oauth-authz-req+jwt" } }
            );
        }

        if (url === `${verifier}/response`) {
            if (!body) throw new Error("Missing presentation response body");

            let responsePayload: unknown;
            if (body.response) {
                const decrypted = await compactDecrypt(body.response, await importJWK(zJwk.parse(this.encryptionKey), this.encryptionAlgorithm));
                const plaintext = new TextDecoder().decode(decrypted.plaintext);
                this.submittedPlaintext = plaintext;
                this.submittedEncryptionHeader = decrypted.protectedHeader;
                if (this.presentationVersion < 100 && this.jarmSigningAlgorithm) {
                    this.submittedJarm = plaintext;
                    responsePayload = (
                        await jwtVerify(plaintext, await importJWK(this.issuedKey, this.jarmSigningAlgorithm), {
                            algorithms: [this.jarmSigningAlgorithm],
                            issuer: "wallet",
                            audience: "x509_san_dns:verifier.example"
                        })
                    ).payload;
                } else {
                    responsePayload = JSON.parse(plaintext);
                }
            } else {
                responsePayload = { ...body, vp_token: JSON.parse(body.vp_token) };
            }

            this.submitted = presentationResponseSchema.parse(responsePayload);

            return this.json({ accepted: true });
        }

        throw new Error(`Unexpected fetch: ${url}`);
    }

    public async issue(holderKey: Jwk, holderDid?: string): Promise<string> {
        if (this.format === "dc+sd-jwt") {
            let saltIndex = 0;
            const sdJwt = new SDJwtVcInstance({
                hasher: async (data, algorithm) => await this.crypto.hash(typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data), algorithm),
                saltGenerator: (length) => (++saltIndex).toString().padStart(length, "s"),
                signAlg: this.issuerAlgorithm,
                signer: async (data) => {
                    const key = await importAsymmetricKey(this.issuerKey, this.issuerAlgorithm);
                    return base64url.encode(
                        new Uint8Array(
                            await crypto.subtle.sign(this.issuerAlgorithm === "ES256" ? { name: "ECDSA", hash: "SHA-256" } : "Ed25519", key, new TextEncoder().encode(data))
                        )
                    );
                }
            });

            return await sdJwt.issue(
                {
                    iss: issuer,
                    vct,
                    cnf: holderDid ? { kid: holderDid } : { jwk: holderKey },
                    iat: Math.floor(Date.now() / 1000),
                    exp: this.expiresAt,
                    name: "Alice",
                    secret: "hidden",
                    address: { street: "Main", city: "Berlin" },
                    status: this.credentialStatus,
                    names: this.names
                },
                { _sd: ["name", "secret"], address: { _sd: ["street", "city"] }, ...(this.names ? { names: { _sd: [0, 1] } } : {}) },
                { header: { kid: "issuer-key" } }
            );
        }

        if (this.format === "jwt_vc_json") {
            const sub = holderDid ?? this.crypto.didForKey(holderKey, "jwk").split("#")[0];
            return await new SignJWT({
                iss: issuer,
                sub,
                nbf: Math.floor(Date.now() / 1000) - 1,
                exp: this.expiresAt,
                vc: {
                    "@context": ["https://www.w3.org/2018/credentials/v1"],
                    type: ["VerifiableCredential", "TestCredential"],
                    issuer,
                    credentialSubject: { id: sub, name: "Alice" }
                }
            })
                .setProtectedHeader({ alg: this.issuerAlgorithm, kid: "issuer-key" })
                .sign(await importJWK(this.issuerKey, this.issuerAlgorithm));
        }

        return (
            await new IssuerSignedBuilder(docType, this.crypto.mdocContext).addIssuerNamespace(namespace, { given_name: "Alice", family_name: "Private" }).sign({
                signingKey: CoseKey.fromJwk(this.issuerKey),
                algorithm: this.issuerAlgorithm === "ES256" ? SignatureAlgorithm.ES256 : SignatureAlgorithm.EdDSA,
                digestAlgorithm: "SHA-256",
                deviceKeyInfo: { deviceKey: DeviceKey.fromJwk(holderKey) },
                certificates: [new Uint8Array(this.issuerCertificate.rawData)],
                validityInfo: {
                    signed: new Date(Math.min(Date.now(), this.expiresAt * 1000) - 2000),
                    validFrom: new Date(Math.min(Date.now(), this.expiresAt * 1000) - 1000),
                    validUntil: new Date(this.expiresAt * 1000)
                }
            })
        ).encodedForOid4Vci;
    }

    public async receive(): Promise<OwnIdentityAttributeWithVerifiableCredential> {
        const offer = await this.holder.resolveCredentialOffer(`openid-credential-offer://?credential_offer_uri=${encodeURIComponent(`${issuer}/offer`)}`);
        const responses = await this.holder.requestCredentials(JSON.parse(JSON.stringify(offer)), ["test"], { pinCode: this.tokenPin });
        const [attribute] = await this.holder.storeCredentials(JSON.parse(JSON.stringify(responses)));

        return attribute;
    }

    public async request(mode: "direct_post" | "direct_post.jwt" = "direct_post"): Promise<OpenId4VpResolvedAuthorizationRequest> {
        if (mode === "direct_post.jwt") {
            const key = await generateKeyPair(this.encryptionAlgorithm, { extractable: true });

            this.encryptionKey = zJwk.parse(await exportJWK(key.privateKey));
            this.encryptionPublicKey = { ...zJwk.parse(await exportJWK(key.publicKey)), use: "enc", alg: this.encryptionAlgorithm, kid: "verifier-key" };
        }

        const claims =
            this.format === "mso_mdoc" ? [{ path: [namespace, "given_name"] }] : this.format === "jwt_vc_json" ? [{ path: ["credentialSubject", "name"] }] : [{ path: ["name"] }];
        const meta =
            this.format === "mso_mdoc"
                ? { doctype_value: docType }
                : this.format === "dc+sd-jwt"
                  ? { vct_values: [vct] }
                  : { type_values: [["VerifiableCredential", "TestCredential"]] };

        this.presentationRequest = {
            client_id: this.requestClientId,
            nonce: "verifier-nonce",
            response_type: "vp_token",
            response_mode: mode,
            response_uri: `${verifier}/response`,
            state: "state",
            dcql_query: { credentials: [{ id: "credential", format: this.format, claims, meta }] },
            client_metadata:
                mode === "direct_post.jwt"
                    ? {
                          jwks: { keys: [this.encryptionPublicKey] },
                          encrypted_response_enc_values_supported: ["A256GCM"],
                          ...(this.jarmSigningAlgorithm ? { authorization_signed_response_alg: this.jarmSigningAlgorithm } : {})
                      }
                    : undefined
        };

        const request = await this.holder.resolveAuthorizationRequest(
            `openid4vp://?client_id=${encodeURIComponent(this.requestClientId)}&request_uri=${encodeURIComponent(`${verifier}/request`)}`
        );
        return { ...request, version: this.presentationVersion };
    }
}

let fixture: Fixture;
beforeEach(async () => {
    fixture = new Fixture();
    await fixture.init();
});

test("encrypts an unsigned JSON authorization response for Final 1.0", async () => {
    // Arrange
    const credential = await fixture.receive();
    const request = await fixture.request("direct_post.jwt");

    // Act
    const result = await fixture.holder.acceptAuthorizationRequest(request, credential);

    // Assert
    expect(result.status).toBe(200);
    expect(JSON.parse(fixture.submittedPlaintext!)).toEqual({ state: "state", vp_token: { credential: [expect.any(String)] } });
    expect(fixture.submittedEncryptionHeader).toMatchObject({ alg: "ECDH-ES", enc: "A256GCM", kid: "verifier-key" });
});

test("does not sign a Final 1.0 response when legacy signing metadata is supplied", async () => {
    // Arrange
    fixture.jarmSigningAlgorithm = "ES384";
    const credential = await fixture.receive();
    const request = await fixture.request("direct_post.jwt");

    // Act
    const result = await fixture.holder.acceptAuthorizationRequest(request, credential);

    // Assert
    expect(result.status).toBe(200);
    expect(JSON.parse(fixture.submittedPlaintext!)).toEqual({ state: "state", vp_token: { credential: [expect.any(String)] } });
    expect(fixture.submittedJarm).toBeUndefined();
});

test.each(["ES256", "EdDSA"])("signs and encrypts a legacy draft JARM response with the requested %s algorithm", async (algorithm) => {
    fixture.algorithm = algorithm;
    fixture.jarmSigningAlgorithm = algorithm;
    fixture.presentationVersion = 25;

    const credential = await fixture.receive();
    const request = await fixture.request("direct_post.jwt");

    await expect(fixture.holder.acceptAuthorizationRequest(request, credential)).resolves.toMatchObject({ status: 200 });

    expect(decodeProtectedHeader(z.string().parse(fixture.submittedJarm)).alg).toBe(algorithm);
    expect(fixture.submitted.vp_token.credential).toHaveLength(1);
});

test.each([
    { holderAlgorithm: "ES256", requestedAlgorithm: "EdDSA" },
    { holderAlgorithm: "EdDSA", requestedAlgorithm: "ES256" },
    { holderAlgorithm: "ES256", requestedAlgorithm: "ES384" },
    { holderAlgorithm: "ES256", requestedAlgorithm: "none" },
    { holderAlgorithm: "ES256", requestedAlgorithm: "" }
])(
    "rejects legacy draft JARM signing algorithm '$requestedAlgorithm' for a $holderAlgorithm holder key before constructing or sending a presentation",
    async ({ holderAlgorithm, requestedAlgorithm }) => {
        fixture.algorithm = holderAlgorithm;
        fixture.presentationVersion = 25;

        const credential = await fixture.receive();
        const request = await fixture.request("direct_post.jwt");
        if (!request.authorizationRequestPayload.client_metadata) throw new Error("Expected client metadata");

        request.authorizationRequestPayload.client_metadata.authorization_signed_response_alg = requestedAlgorithm;

        const present = vi.spyOn(CredentialFormats.prototype, "present");

        try {
            await expect(fixture.holder.acceptAuthorizationRequest(request, credential)).rejects.toThrow(
                `Requested JARM signing algorithm '${requestedAlgorithm}' is not supported by the selected credential (holder algorithm '${holderAlgorithm}')`
            );
            expect(present).not.toHaveBeenCalled();
            expect(fixture.requests.some(({ url }) => url === `${verifier}/response`)).toBe(false);
        } finally {
            present.mockRestore();
        }
    }
);

describe.each<OpenId4VcCredentialFormat>(["dc+sd-jwt", "mso_mdoc", "jwt_vc_json"])("%s", (format) => {
    test.each(["direct_post", "direct_post.jwt"] as const)("receives, stores and presents using %s after restart", async (mode) => {
        fixture.format = format;

        const credential = await fixture.receive();

        expect(credential.content.value.displayInformation?.[0].name).toBe("Test credential");
        expect(credential.content.value.toJSON().displayInformation?.[0].name).toBe("Test credential");
        expect(fixture.account.syncDatawallet).toHaveBeenCalled();

        fixture.holder = fixture.restart();

        const request = JSON.parse(JSON.stringify(await fixture.request(mode)));

        expect(await fixture.holder.matchingCredentials(request)).toStrictEqual([credential]);

        const response = await fixture.holder.acceptAuthorizationRequest(request, credential);

        expect(response.status).toBe(200);
        expect(fixture.submitted.state).toBe("state");

        const presentation = fixture.submitted.vp_token.credential[0];
        if (format === "dc+sd-jwt") {
            const verified = await fixture.crypto.verifyIssuerJwt(presentation.split("~")[0]);

            expect(verified.iss).toBe(issuer);

            const claims = await new SDJwtVcInstance({
                hasher: (data, algorithm) => fixture.crypto.hash(typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data), algorithm)
            }).getClaims(presentation);

            expect(claims.name).toBe("Alice");
            expect(claims.secret).toBeUndefined();
            expect(claims.address).toStrictEqual({});

            const kb = decodeJwt(z.string().parse(presentation.split("~").at(-1)));

            expect(kb.nonce).toBe("verifier-nonce");
            expect(kb.aud).toBe("x509_san_dns:verifier.example");
        } else if (format === "jwt_vc_json") {
            const { payload } = await jwtVerify(presentation, await importJWK(fixture.issuedKey, "ES256"), { audience: "x509_san_dns:verifier.example" });

            expect(payload.nonce).toBe("verifier-nonce");
            expect(z.object({ verifiableCredential: z.array(z.string()) }).parse(payload.vp).verifiableCredential).toStrictEqual([credential.content.value.value]);
        } else {
            const deviceResponse = DeviceResponse.fromEncodedForOid4Vp(presentation);

            expect(deviceResponse.documents![0].issuerSigned.getPrettyClaims(namespace)).toStrictEqual({ given_name: "Alice" });

            const transcript = await SessionTranscript.forOid4Vp(
                {
                    clientId: fixture.presentationRequest.client_id,
                    nonce: fixture.presentationRequest.nonce,
                    responseUri: `${verifier}/response`,
                    jwkThumbprint: fixture.encryptionPublicKey
                        ? base64url.decode(await import("jose").then(({ calculateJwkThumbprint }) => calculateJwkThumbprint(fixture.encryptionPublicKey!)))
                        : undefined
                },
                fixture.crypto.mdocContext
            );

            await expect(
                deviceResponse.verify(
                    { sessionTranscript: transcript, trustedCertificates: [{ issuance: [new Uint8Array(fixture.issuerCertificate.rawData)] }] },
                    fixture.crypto.mdocContext
                )
            ).resolves.toBeDefined();
        }
    });

    test("does not match an expired credential", async () => {
        fixture.format = format;

        const credential = await fixture.receive();

        fixture.expiresAt = Math.floor(Date.now() / 1000) - 60;
        credential.content.value.value = await fixture.issue(fixture.issuedKey);

        const request = await fixture.request();

        expect(await fixture.holder.matchingCredentials(request)).toStrictEqual([]);
        await expect(fixture.holder.acceptAuthorizationRequest(request, credential)).rejects.toThrow(expect.any(Error));
    });

    test("does not present a credential without its key", async () => {
        fixture.format = format;

        const credential = await fixture.receive();
        const request = await fixture.request();

        fixture.keyEntries.clear();

        expect(await fixture.holder.matchingCredentials(request)).toStrictEqual([]);
        await expect(fixture.holder.acceptAuthorizationRequest(request, credential)).rejects.toThrow("Holder key not found");
    });
});

test.each(["EdDSA", "ES256"])("uses %s with did:key and verifies a presentation token", async (algorithm) => {
    fixture.algorithm = algorithm;
    fixture.bindingMethod = "did:key";

    const credential = await fixture.receive();
    const token = await fixture.holder.createPresentationTokenContent(credential.content.value, "token-id");
    const result = await fixture.restart().verifyPresentationTokenContent(token, "token-id");

    expect(result).toStrictEqual({ isValid: true });
    expect((await fixture.holder.verifyPresentationTokenContent(token, "wrong-id")).error?.message).toBe("Verify Error: Invalid Nonce");
});

test.each<OpenId4VcCredentialFormat>(["dc+sd-jwt", "mso_mdoc", "jwt_vc_json"])("receives and presents %s when the WebView supports P-256 but not Ed25519", async (format) => {
    fixture.format = format;
    fixture.proofAlgorithms = ["EdDSA", "ES256"];

    const generate = vi.spyOn(crypto.subtle, "generateKey").mockRejectedValueOnce(new DOMException("Ed25519 is not supported", "NotSupportedError"));

    try {
        const credential = await fixture.receive();

        expect(fixture.issuedKey).toMatchObject({ kty: "EC", crv: "P-256" });
        expect(fixture.keyEntries.size).toBe(1);

        fixture.holder = fixture.restart();
        await fixture.holder.acceptAuthorizationRequest(await fixture.request(), credential);

        expect(fixture.submitted.vp_token.credential).toHaveLength(1);
    } finally {
        generate.mockRestore();
    }
});

test("rejects an Ed25519-only issuer when the WebView does not support Ed25519", async () => {
    fixture.proofAlgorithms = ["EdDSA"];

    const generate = vi.spyOn(crypto.subtle, "generateKey").mockRejectedValueOnce(new DOMException("Ed25519 is not supported", "NotSupportedError"));

    try {
        await expect(fixture.receive()).rejects.toThrow("None of the issuer's holder signature algorithms are available");
        expect(fixture.keyEntries.size).toBe(0);
        expect(fixture.requests.some(({ url }) => url === `${issuer}/credential`)).toBe(false);
    } finally {
        generate.mockRestore();
    }
});

test("preserves the issuer's algorithm preference when Ed25519 is available", async () => {
    fixture.proofAlgorithms = ["RS256", "EdDSA", "ES256"];
    await fixture.receive();

    expect(fixture.issuedKey).toMatchObject({ kty: "OKP", crv: "Ed25519" });
});

test("does not retry key generation after an unrelated cryptographic failure", async () => {
    fixture.proofAlgorithms = ["EdDSA", "ES256"];

    const generate = vi.spyOn(crypto.subtle, "generateKey").mockRejectedValueOnce(new DOMException("Key generation failed", "OperationError"));

    try {
        await expect(fixture.receive()).rejects.toThrow("Key generation failed");
        expect(generate).toHaveBeenCalledTimes(1);
        expect(fixture.keyEntries.size).toBe(0);
    } finally {
        generate.mockRestore();
    }
});

test("rejects an issuer without a supported holder algorithm", async () => {
    fixture.proofAlgorithms = ["RS256"];

    await expect(fixture.receive()).rejects.toThrow("No supported holder signature algorithm");
    expect(fixture.keyEntries.size).toBe(0);
});

test("does not generate another holder key when synchronized storage fails", async () => {
    const generate = vi.spyOn(crypto.subtle, "generateKey");
    const store = vi.spyOn(fixture.keyStorage, "storeKey").mockRejectedValueOnce(new DOMException("Storage is not supported", "NotSupportedError"));

    try {
        await expect(fixture.crypto.createKeyForAlgorithms(["EdDSA", "ES256"])).rejects.toThrow("Storage is not supported");
        expect(generate).toHaveBeenCalledTimes(1);
        expect(fixture.keyEntries.size).toBe(0);
    } finally {
        generate.mockRestore();
        store.mockRestore();
    }
});

test.each([undefined, {}])("explains how to load a WebView when Web Crypto is unavailable (%j)", async (webCrypto) => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");
    if (!descriptor) throw new Error("Expected a native Web Crypto implementation for this test");

    Object.defineProperty(globalThis, "crypto", { configurable: true, value: webCrypto });

    try {
        await expect(fixture.crypto.createKeyForAlgorithms(["EdDSA", "ES256"])).rejects.toThrow("supply an HTTPS baseUrl to loadHtmlString");
        await expect(fixture.crypto.hash(new Uint8Array([1]))).rejects.toThrow("OpenID4VC requires Web Crypto in a secure context");
        expect(() => fixture.crypto.callbacks.generateRandom(16)).toThrow("OpenID4VC requires Web Crypto in a secure context");
        expect(fixture.keyEntries.size).toBe(0);
    } finally {
        Object.defineProperty(globalThis, "crypto", descriptor);
    }
});

test("uses did:jwk and an external access token", async () => {
    fixture.bindingMethod = "did:jwk";

    const offer = await fixture.holder.resolveCredentialOffer(`openid-credential-offer://?credential_offer_uri=${encodeURIComponent(`${issuer}/offer`)}`);
    const responses = await fixture.holder.requestCredentials(offer, ["test"], { accessToken: "external-token" });

    expect(responses).toHaveLength(1);
    expect(fixture.accessTokens).toStrictEqual(["Bearer external-token"]);
    expect(fixture.requests.some(({ url }) => url === `${issuer}/token`)).toBe(false);
});

test("rejects an incorrect PIN and accepts the correct PIN", async () => {
    fixture.tokenPin = "1234";

    const offer = await fixture.holder.resolveCredentialOffer(`openid-credential-offer://?credential_offer_uri=${encodeURIComponent(`${issuer}/offer`)}`);

    await expect(fixture.holder.requestCredentials(offer, ["test"], { pinCode: "9999" })).rejects.toThrow(expect.any(Error));
    await expect(fixture.holder.requestCredentials(offer, ["test"], { pinCode: "1234" })).resolves.toHaveLength(1);
});

test("rejects unknown configuration ids before requesting a token", async () => {
    const offer = await fixture.holder.resolveCredentialOffer(`openid-credential-offer://?credential_offer_uri=${encodeURIComponent(`${issuer}/offer`)}`);

    await expect(fixture.holder.requestCredentials(offer, ["unknown"], {})).rejects.toThrow("Unknown credential configuration");
    expect(fixture.requests.some(({ url }) => url === `${issuer}/token`)).toBe(false);
});

test("rechecks the selected credential and rejects multiple queries", async () => {
    const credential = await fixture.receive();
    const request = await fixture.request();
    const query = request.authorizationRequestPayload.dcql_query;
    if (query?.credentials[0].format !== "dc+sd-jwt") throw new Error("Expected an SD-JWT query");

    query.credentials[0].meta = { vct_values: ["different"] };

    await expect(fixture.holder.acceptAuthorizationRequest(request, credential)).rejects.toThrow("does not match the query");

    query.credentials.push({ ...query.credentials[0], id: "second" });

    await expect(fixture.holder.matchingCredentials(request)).rejects.toThrow("Exactly one credential query");
});

test("rejects invalid signatures and audiences on SD-JWT tokens", async () => {
    const credential = await fixture.receive();
    const token = await fixture.holder.createPresentationTokenContent(credential.content.value, "token-id");
    const parts = (token.value as string).split("~");
    const jwt = parts[0].split(".");
    const signature = base64url.decode(jwt[2]);

    signature[0] ^= 1;
    jwt[2] = base64url.encode(signature);
    parts[0] = jwt.join(".");

    const invalid = TokenContentVerifiablePresentation.from({ type: token.type, value: parts.join("~") });

    expect((await fixture.holder.verifyPresentationTokenContent(invalid, "token-id")).error?.message).toBe("Verify Error: Invalid JWT Signature");

    const kbPayload = decodeJwt((token.value as string).split("~").at(-1)!);
    const wrongAudienceKb = await fixture.crypto.signJwt({ ...kbPayload, aud: "wrong-audience" }, fixture.issuedKey, { typ: "kb+jwt" });
    const wrongAudience = TokenContentVerifiablePresentation.from({
        type: token.type,
        value: `${(token.value as string).slice(0, (token.value as string).lastIndexOf("~") + 1)}${wrongAudienceKb}`
    });

    expect((await fixture.holder.verifyPresentationTokenContent(wrongAudience, "token-id")).error?.message).toBe("Verify Error: Invalid Audience");
});

test.each<OpenId4VcCredentialFormat>(["mso_mdoc", "jwt_vc_json"])("does not create enmeshed tokens for %s", async (format) => {
    fixture.format = format;

    const credential = await fixture.receive();

    await expect(fixture.holder.createPresentationTokenContent(credential.content.value, "token-id")).rejects.toThrow("Only SD-JWT");
});

test.each<OpenId4VcCredentialFormat>(["dc+sd-jwt", "mso_mdoc", "jwt_vc_json"])("rejects a modified %s signature before storing any attribute", async (format) => {
    fixture.format = format;

    const credential = await fixture.receive();
    const valid = credential.content.value.value as string;
    let invalid: string;
    if (format === "mso_mdoc") {
        const document = IssuerSigned.fromEncodedForOid4Vci(valid);

        document.issuerAuth.signature[0] ^= 1;
        invalid = document.encodedForOid4Vci;
    } else {
        const parts = valid.split("~");
        const jwt = parts[0].split(".");
        const signature = base64url.decode(jwt[2]);

        signature[0] ^= 1;
        jwt[2] = base64url.encode(signature);
        parts[0] = jwt.join(".");
        invalid = parts.join("~");
    }

    fixture.attributes.length = 0;

    await expect(
        fixture.holder.storeCredentials([
            { claimFormat: format, encoded: valid },
            { claimFormat: format, encoded: invalid }
        ])
    ).rejects.toThrow(expect.any(Error));
    expect(fixture.attributes).toHaveLength(0);
});

test.each<OpenId4VcCredentialFormat>(["dc+sd-jwt", "mso_mdoc", "jwt_vc_json"])("presents a synchronized %s credential on another device", async (format) => {
    fixture.format = format;

    const attribute = await fixture.receive();
    const otherDevice = new Fixture();

    otherDevice.format = format;
    otherDevice.issuerKey = fixture.issuerKey;
    otherDevice.issuerPublicKey = fixture.issuerPublicKey;
    otherDevice.issuerCertificate = fixture.issuerCertificate;

    for (const [id, entry] of fixture.keyEntries) otherDevice.keyEntries.set(id, JSON.parse(JSON.stringify(entry)));

    const synchronized = OwnIdentityAttribute.from({
        id: attribute.id,
        createdAt: attribute.createdAt,
        content: IdentityAttribute.from(JSON.parse(JSON.stringify(attribute.content)))
    });

    otherDevice.attributes.push(synchronized);

    const request = await otherDevice.request();

    expect(await otherDevice.holder.matchingCredentials(request)).toStrictEqual([synchronized]);
    await expect(otherDevice.holder.acceptAuthorizationRequest(request, synchronized)).resolves.toMatchObject({ status: 200 });
});

test("rejects Presentation Exchange explicitly", async () => {
    const request = await fixture.request();

    request.authorizationRequestPayload.presentation_definition = { id: "pex", input_descriptors: [] };

    await expect(fixture.holder.matchingCredentials(request)).rejects.toThrow("Presentation Exchange is not supported");
});

test("rejects empty credential batches", async () => {
    await expect(fixture.holder.storeCredentials([])).rejects.toThrow("At least one credential is required");
});

test("uses the injected fetch for did:web and rejects a mismatched DID document", async () => {
    const did = "did:web:issuer.example:credentials";
    let documentId = did;
    const fetched: string[] = [];
    const cryptography = new OpenId4VcCrypto(fixture.keyStorage, async (input) => {
        fetched.push(input.toString());

        return new Response(
            JSON.stringify({ id: documentId, verificationMethod: [{ id: `${did}#key`, controller: did, publicKeyJwk: fixture.issuerPublicKey }], assertionMethod: [`${did}#key`] })
        );
    });
    const jwt = await new SignJWT({ iss: did }).setProtectedHeader({ alg: "ES256", kid: `${did}#key` }).sign(await importJWK(fixture.issuerKey, "ES256"));

    expect(await cryptography.verifyIssuerJwt(jwt)).toMatchObject({ iss: did });
    expect(fetched).toStrictEqual(["https://issuer.example/credentials/did.json"]);

    documentId = "did:web:different.example";

    await expect(cryptography.verifyIssuerJwt(jwt)).rejects.toThrow("DID document id mismatch");
});

test("rejects JWKS metadata for a different issuer", async () => {
    const cryptography = new OpenId4VcCrypto(fixture.keyStorage, () =>
        Promise.resolve(new Response(JSON.stringify({ issuer: "https://different.example", jwks: { keys: [fixture.issuerPublicKey] } })))
    );
    const jwt = await new SignJWT({ iss: issuer }).setProtectedHeader({ alg: "ES256" }).sign(await importJWK(fixture.issuerKey, "ES256"));

    await expect(cryptography.verifyIssuerJwt(jwt)).rejects.toThrow("JWT issuer metadata mismatch");
});

test.each<OpenId4VcCredentialFormat>(["dc+sd-jwt", "mso_mdoc", "jwt_vc_json"])("rejects an issued %s credential bound to a different holder key", async (format) => {
    fixture.format = format;

    const otherKey = await fixture.crypto.createKey("ES256");
    const issue = fixture.issue.bind(fixture);

    vi.spyOn(fixture, "issue").mockImplementation(() => issue(otherKey));

    await expect(fixture.receive()).rejects.toThrow("Issued credential does not match the requested holder key");
    expect(fixture.attributes).toHaveLength(0);
});

test("does not trust a DID signing key for an HTTPS issuer without issuer-bound JWKS", async () => {
    const jwt = await new SignJWT({ iss: issuer })
        .setProtectedHeader({ alg: "ES256", kid: fixture.crypto.didForKey(fixture.issuerPublicKey, "key") })
        .sign(await importJWK(fixture.issuerKey, "ES256"));

    await expect(fixture.crypto.verifyIssuerJwt(jwt)).rejects.toMatchObject({ code: "ERR_JWKS_NO_MATCHING_KEY" });
});

test("rejects a token without key binding and a modified holder signature", async () => {
    const credential = await fixture.receive();
    const token = await fixture.holder.createPresentationTokenContent(credential.content.value, "token-id");
    const parts = (token.value as string).split("~");
    const kb = parts[parts.length - 1].split(".");
    const signature = base64url.decode(kb[2]);

    signature[0] ^= 1;
    kb[2] = base64url.encode(signature);
    parts[parts.length - 1] = kb.join(".");

    expect(
        (await fixture.holder.verifyPresentationTokenContent(TokenContentVerifiablePresentation.from({ type: token.type, value: parts.join("~") }), "token-id")).error?.message
    ).toBe("Verify Error: Invalid JWT Signature");

    parts[parts.length - 1] = "";

    expect(
        (await fixture.holder.verifyPresentationTokenContent(TokenContentVerifiablePresentation.from({ type: token.type, value: parts.join("~") }), "token-id")).error?.message
    ).toBe("Verify Error: Missing Key Binding JWT");
});

test("receives and presents mdoc credentials with an Ed25519 holder key", async () => {
    fixture.format = "mso_mdoc";
    fixture.algorithm = "EdDSA";

    const attribute = await fixture.receive();
    const request = await fixture.request();

    await fixture.holder.acceptAuthorizationRequest(request, attribute);

    const response = DeviceResponse.fromEncodedForOid4Vp(fixture.submitted.vp_token.credential[0]);
    const transcript = await SessionTranscript.forOid4Vp(
        { clientId: request.authorizationRequestPayload.client_id, nonce: request.authorizationRequestPayload.nonce, responseUri: `${verifier}/response` },
        fixture.crypto.mdocContext
    );

    await expect(
        response.verify({ sessionTranscript: transcript, trustedCertificates: [{ issuance: [new Uint8Array(fixture.issuerCertificate.rawData)] }] }, fixture.crypto.mdocContext)
    ).resolves.toBeDefined();
});

test.each<OpenId4VcCredentialFormat>(["dc+sd-jwt", "mso_mdoc", "jwt_vc_json"])("verifies %s credentials and verifier requests signed by Ed25519 issuers", async (format) => {
    fixture.format = format;
    fixture.issuerAlgorithm = "EdDSA";
    await fixture.init();

    const attribute = await fixture.receive();
    const request = await fixture.request();

    expect(await fixture.holder.matchingCredentials(request)).toStrictEqual([attribute]);
    await expect(fixture.holder.acceptAuthorizationRequest(request, attribute)).resolves.toMatchObject({ status: 200 });
});

test.each(["embedded", "remote"])("selects the signing key from mixed %s JWKS using only the injected fetch", async (location) => {
    const keys = [
        { ...fixture.issuerPublicKey, kid: "issuer-key", use: "enc" },
        { ...fixture.issuerPublicKey, kid: "issuer-key", use: "sig", key_ops: ["verify"] },
        { kty: "OKP", crv: "Ed25519", x: base64url.encode(new Uint8Array(32)), kid: "issuer-key" }
    ];
    const fetched: string[] = [];
    const cryptography = new OpenId4VcCrypto(fixture.keyStorage, async (input) => {
        const url = input.toString();

        fetched.push(url);
        if (url === `${issuer}/.well-known/jwt-vc-issuer`) {
            return new Response(JSON.stringify({ issuer, ...(location === "embedded" ? { jwks: { keys } } : { jwks_uri: `${issuer}/jwks` }) }));
        }

        if (url === `${issuer}/jwks`) return new Response(JSON.stringify({ keys }));

        throw new Error("Unexpected fetch");
    });
    const jwt = await new SignJWT({ iss: issuer }).setProtectedHeader({ alg: "ES256", kid: "issuer-key" }).sign(await importJWK(fixture.issuerKey, "ES256"));

    await expect(cryptography.verifyIssuerJwt(jwt)).resolves.toMatchObject({ iss: issuer });
    expect(fetched).toStrictEqual(location === "embedded" ? [`${issuer}/.well-known/jwt-vc-issuer`] : [`${issuer}/.well-known/jwt-vc-issuer`, `${issuer}/jwks`]);
});

test.each([{ use: "enc" }, { key_ops: ["encrypt"] }, { alg: "ES384" }])("rejects an issuer JWKS signing key with incompatible metadata %j", async (metadata) => {
    const cryptography = new OpenId4VcCrypto(fixture.keyStorage, () =>
        Promise.resolve(new Response(JSON.stringify({ issuer, jwks: { keys: [{ ...fixture.issuerPublicKey, ...metadata }] } })))
    );
    const jwt = await new SignJWT({ iss: issuer }).setProtectedHeader({ alg: "ES256" }).sign(await importJWK(fixture.issuerKey, "ES256"));

    await expect(cryptography.verifyIssuerJwt(jwt)).rejects.toMatchObject({ code: "ERR_JWKS_NO_MATCHING_KEY" });
});

test("rejects ambiguous issuer JWKS signing keys", async () => {
    const cryptography = new OpenId4VcCrypto(fixture.keyStorage, () =>
        Promise.resolve(new Response(JSON.stringify({ issuer, jwks: { keys: [fixture.issuerPublicKey, fixture.issuerPublicKey] } })))
    );
    const jwt = await new SignJWT({ iss: issuer }).setProtectedHeader({ alg: "ES256" }).sign(await importJWK(fixture.issuerKey, "ES256"));

    await expect(cryptography.verifyIssuerJwt(jwt)).rejects.toMatchObject({ code: "ERR_JWKS_MULTIPLE_MATCHING_KEYS" });
});

test.each([
    { claim: "exp", offset: -10, valid: true },
    { claim: "exp", offset: -31, valid: false },
    { claim: "nbf", offset: 10, valid: true },
    { claim: "nbf", offset: 31, valid: false }
])("applies SD-JWT clock skew to $claim with offset $offset", async ({ claim, offset, valid }) => {
    const now = Math.floor(Date.now() / 1000);
    const jwt = await new SignJWT({ iss: issuer, vct, [claim]: now + offset })
        .setProtectedHeader({ alg: "ES256", typ: "dc+sd-jwt", kid: "issuer-key" })
        .sign(await importJWK(fixture.issuerKey, "ES256"));
    const formats = new CredentialFormats(fixture.crypto, (...args) => fixture.fetch(...args));
    const verified = formats.sdJwt().verify(`${jwt}~`, { currentDate: now, skewSeconds: 30 });
    if (valid) await expect(verified).resolves.toMatchObject({ payload: { [claim]: now + offset } });
    else await expect(verified).rejects.toMatchObject({ code: claim === "exp" ? "JWT_EXPIRED" : "JWT_NOT_YET_VALID" });
});

test("receives, stores and presents SD-JWT credentials within the configured expiration tolerance", async () => {
    fixture.expiresAt = Math.floor(Date.now() / 1000) - 10;

    const credential = await fixture.receive();
    const request = await fixture.request();

    expect(await fixture.holder.matchingCredentials(request)).toStrictEqual([credential]);
    await expect(fixture.holder.acceptAuthorizationRequest(request, credential)).resolves.toMatchObject({ status: 200 });

    const token = await fixture.holder.createPresentationTokenContent(credential.content.value, "token-id");

    await expect(fixture.holder.verifyPresentationTokenContent(token, "token-id")).resolves.toStrictEqual({ isValid: true });
});

test.each([
    { "@context": [] },
    { type: ["TestCredential"] },
    { credentialSubject: {} },
    { issuanceDate: "invalid-date" },
    { expirationDate: "invalid-date" },
    { validFrom: "invalid-date" },
    { validUntil: "invalid-date" }
])("rejects a signed W3C credential with invalid payload %j before storage", async (invalidFields) => {
    fixture.format = "jwt_vc_json";

    const holderKey = await fixture.crypto.createKey("ES256");
    const payload = decodeJwt(await fixture.issue(holderKey));

    payload.vc = { ...(payload.vc as object), ...invalidFields };

    const encoded = await new SignJWT(payload).setProtectedHeader({ alg: "ES256", kid: "issuer-key" }).sign(await importJWK(fixture.issuerKey, "ES256"));

    await expect(fixture.holder.storeCredentials([{ claimFormat: "jwt_vc_json", encoded }])).rejects.toThrow("schema_error");
    expect(fixture.attributes).toHaveLength(0);
});

test.each([
    { issuanceDate: "2020-01-01T00:00:00Z", expirationDate: "2040-01-01T00:00:00Z" },
    { validFrom: "2020-01-01T00:00:00Z", validUntil: "2040-01-01T00:00:00Z" }
])("validates W3C date fields and generates a standard JWT presentation", async (dates) => {
    fixture.format = "jwt_vc_json";

    const holderKey = await fixture.crypto.createKey("ES256");
    const payload = decodeJwt(await fixture.issue(holderKey));

    payload.vc = { ...(payload.vc as object), ...dates };

    const encoded = await new SignJWT(payload).setProtectedHeader({ alg: "ES256", kid: "issuer-key" }).sign(await importJWK(fixture.issuerKey, "ES256"));
    const [attribute] = await fixture.holder.storeCredentials([{ claimFormat: "jwt_vc_json", encoded }]);

    await fixture.holder.acceptAuthorizationRequest(await fixture.request(), attribute);

    const { payload: presentation } = await jwtVerify(fixture.submitted.vp_token.credential[0], await importJWK(holderKey, "ES256"), { audience: "x509_san_dns:verifier.example" });

    expect(presentation.iss).toBe(payload.sub);
    expect(presentation.nonce).toBe("verifier-nonce");
    expect(presentation.vp).toStrictEqual({
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        type: ["VerifiablePresentation"],
        verifiableCredential: [encoded]
    });
});

test.each([{ expirationDate: "2020-01-01T00:00:00Z" }, { validUntil: "2020-01-01T00:00:00Z" }, { issuanceDate: "2040-01-01T00:00:00Z" }, { validFrom: "2040-01-01T00:00:00Z" }])(
    "rejects a W3C credential outside its validity dates %j even with a valid JWT exp",
    async (dates) => {
        fixture.format = "jwt_vc_json";

        const holderKey = await fixture.crypto.createKey("ES256");
        const payload = decodeJwt(await fixture.issue(holderKey));

        payload.vc = { ...(payload.vc as object), ...dates };

        const encoded = await new SignJWT(payload).setProtectedHeader({ alg: "ES256", kid: "issuer-key" }).sign(await importJWK(fixture.issuerKey, "ES256"));

        await expect(fixture.holder.storeCredentials([{ claimFormat: "jwt_vc_json", encoded }])).rejects.toThrow("W3C credential is not valid at the current time");
        expect(fixture.attributes).toHaveLength(0);
    }
);

test("maps an expired SD-JWT token to an enmeshed verification error", async () => {
    const credential = await fixture.receive();
    const token = await fixture.holder.createPresentationTokenContent(credential.content.value, "token-id");
    const parts = (token.value as string).split("~");
    const payload = decodeJwt(parts[0]);

    payload.exp = Math.floor(Date.now() / 1000) - 60;
    parts[0] = await new SignJWT(payload).setProtectedHeader({ alg: "ES256", typ: "dc+sd-jwt", kid: "issuer-key" }).sign(await importJWK(fixture.issuerKey, "ES256"));

    const result = await fixture.holder.verifyPresentationTokenContent(TokenContentVerifiablePresentation.from({ type: token.type, value: parts.join("~") }), "token-id");

    expect(result).toMatchObject({ isValid: false, error: { name: "PresentationVerificationError", message: "Verify Error: Expired JWT" } });
});

test.each([
    { notBefore: new Date("2020-01-01"), notAfter: new Date("2021-01-01") },
    { notBefore: new Date("2040-01-01"), notAfter: new Date("2041-01-01") }
])("rejects an issuer certificate outside its validity interval %j", async (validity) => {
    const certificate = await X509CertificateGenerator.createSelfSigned({
        name: "CN=Test Issuer,C=DE",
        serialNumber: "02",
        ...validity,
        signingAlgorithm: { name: "ECDSA", hash: "SHA-256" },
        keys: { publicKey: await importAsymmetricKey(fixture.issuerPublicKey, "ES256"), privateKey: await importAsymmetricKey(fixture.issuerKey, "ES256") }
    });
    const jwt = await new SignJWT({ iss: issuer })
        .setProtectedHeader({ alg: "ES256", x5c: [base64url.encode(new Uint8Array(certificate.rawData))] })
        .sign(await importJWK(fixture.issuerKey, "ES256"));

    await expect(fixture.crypto.verifyIssuerJwt(jwt)).rejects.toThrow("Certificate is not valid at the current time");
});

test.each([null, "not-a-key", {}, { kty: 42 }, { kty: "EC", crv: "P-256", x: 42 }])("rejects malformed public JWKs: %j", (key) => {
    expect(() => fixture.crypto.publicKey(key)).toThrow(z.ZodError);
});

test("rejects private key material at public JWK and did:jwk boundaries", async () => {
    expect(() => fixture.crypto.publicKey(fixture.issuerKey)).toThrow("Expected an asymmetric public JWK");

    const did = `did:jwk:${base64url.encode(JSON.stringify(fixture.issuerKey))}#0`;

    await expect(fixture.crypto.resolveDid(did)).rejects.toThrow("Expected an asymmetric public JWK");
});

test("rejects malformed synchronized holder keys before signing", async () => {
    await fixture.receive();

    const [id, entry] = [...fixture.keyEntries][0];

    fixture.keyEntries.set(id, { ...entry, key: { publicKey: fixture.issuedKey, privateKey: { kty: 42 } } });

    await expect(fixture.crypto.getPrivateKey(fixture.issuedKey)).rejects.toThrow(z.ZodError);
    await expect(fixture.crypto.signJwt({ nonce: "nonce" }, fixture.issuedKey)).rejects.toThrow(z.ZodError);
});

test("ignores and rejects an attribute that does not contain a verifiable credential", async () => {
    const credential = await fixture.receive();
    const otherAttribute = OwnIdentityAttribute.from({
        id: CoreId.from("ATT00000000000000001"),
        createdAt: CoreDate.utc(),
        content: IdentityAttribute.from({ owner: fixture.account.identity.address, value: GivenName.from("Alice") })
    });

    fixture.attributes.push(otherAttribute);

    const request = await fixture.request();

    expect(await fixture.holder.matchingCredentials(request)).toStrictEqual([credential]);
    await expect(fixture.holder.acceptAuthorizationRequest(request, otherAttribute)).rejects.toThrow("does not contain a verifiable credential");
    expect(fixture.requests.some(({ url }) => url === `${verifier}/response`)).toBe(false);
});

test("rejects malformed DCQL in a signed authorization request", async () => {
    await fixture.request();
    fixture.presentationRequest.dcql_query = { credentials: [{ id: "credential", format: "dc+sd-jwt", claims: [{ path: 42 }] }] };

    await expect(
        fixture.holder.resolveAuthorizationRequest(`openid4vp://?client_id=x509_san_dns%3Averifier.example&request_uri=${encodeURIComponent(`${verifier}/request`)}`)
    ).rejects.toThrow(ValiError);
});

test("rejects DCQL sets with unknown credential identifiers", async () => {
    const request = await fixture.request();
    const query = request.authorizationRequestPayload.dcql_query;
    if (!query) throw new Error("Expected a DCQL query");

    query.credential_sets = [{ options: [["unknown-credential"]] }];

    await expect(fixture.holder.matchingCredentials(request)).rejects.toThrow("Credential set contains undefined credential id");
});

test("rejects DCQL claim sets with unknown claim identifiers", async () => {
    const request = await fixture.request();
    const query = request.authorizationRequestPayload.dcql_query;
    if (!query) throw new Error("Expected a DCQL query");

    query.credentials[0].claim_sets = [["unknown-claim"]];

    await expect(fixture.holder.matchingCredentials(request)).rejects.toThrow("Credential set contains undefined credential id");
});

test("rejects malformed issuer JWKS instead of trusting its declared type", async () => {
    const cryptography = new OpenId4VcCrypto(fixture.keyStorage, () => Promise.resolve(new Response(JSON.stringify({ issuer, jwks: { keys: [{ kty: 42 }] } }))));
    const jwt = await new SignJWT({ iss: issuer }).setProtectedHeader({ alg: "ES256" }).sign(await importJWK(fixture.issuerKey, "ES256"));

    await expect(cryptography.verifyIssuerJwt(jwt)).rejects.toThrow(z.ZodError);
});

test("rejects a deferred response explicitly", async () => {
    // Arrange
    fixture.credentialResponseOverride = { transaction_id: "deferred", interval: 5 };
    const offer = await fixture.holder.resolveCredentialOffer(`openid-credential-offer://?credential_offer_uri=${encodeURIComponent(`${issuer}/offer`)}`);

    // Act
    const result = fixture.holder.requestCredentials(offer, ["test"], {});

    // Assert
    await expect(result).rejects.toThrow("deferred issuance is not supported");
});

test("rejects an empty credentials array", async () => {
    // Arrange
    fixture.credentialResponseOverride = { credentials: [] };
    const offer = await fixture.holder.resolveCredentialOffer(`openid-credential-offer://?credential_offer_uri=${encodeURIComponent(`${issuer}/offer`)}`);

    // Act
    const result = fixture.holder.requestCredentials(offer, ["test"], {});

    // Assert
    await expect(result).rejects.toThrow("Issuer did not return credentials");
});

test("rejects multiple credentials returned for a single proof", async () => {
    // Arrange
    fixture.credentialResponseOverride = { credentials: [{ credential: "first" }, { credential: "second" }] };
    const offer = await fixture.holder.resolveCredentialOffer(`openid-credential-offer://?credential_offer_uri=${encodeURIComponent(`${issuer}/offer`)}`);

    // Act
    const result = fixture.holder.requestCredentials(offer, ["test"], {});

    // Assert
    await expect(result).rejects.toThrow("Issuer returned multiple credentials for one holder key");
});

test("rejects a JSON object where an encoded credential is required", async () => {
    // Arrange
    fixture.credentialResponseOverride = { credentials: [{ credential: { unsupported: true } }] };
    const offer = await fixture.holder.resolveCredentialOffer(`openid-credential-offer://?credential_offer_uri=${encodeURIComponent(`${issuer}/offer`)}`);

    // Act
    const result = fixture.holder.requestCredentials(offer, ["test"], {});

    // Assert
    await expect(result).rejects.toThrow("Unsupported credential encoding");
});

test.each(["invalid_proof", "invalid_nonce", "invalid_credential_request"])("preserves the issuer's %s error", async (error) => {
    // Arrange
    fixture.credentialResponseOverride = { error, error_description: "Issuer rejected the request" };
    fixture.credentialResponseStatus = 400;
    const offer = await fixture.holder.resolveCredentialOffer(`openid-credential-offer://?credential_offer_uri=${encodeURIComponent(`${issuer}/offer`)}`);

    // Act
    const result = fixture.holder.requestCredentials(offer, ["test"], {});

    // Assert
    await expect(result).rejects.toMatchObject({ errorResponse: { error, error_description: "Issuer rejected the request" } });
});

test("verifies a credential with an active status list entry", async () => {
    // Arrange
    fixture.credentialStatus = { status_list: { uri: `${issuer}/status`, idx: 0 } };
    fixture.statusListResponse = new Response(await createStatusListJwt(0));
    const offer = await fixture.holder.resolveCredentialOffer(`openid-credential-offer://?credential_offer_uri=${encodeURIComponent(`${issuer}/offer`)}`);

    // Act
    const result = await fixture.holder.requestCredentials(offer, ["test"], {});

    // Assert
    expect(result).toHaveLength(1);
});

test("rejects a credential revoked after issuance", async () => {
    // Arrange
    fixture.credentialStatus = { status_list: { uri: `${issuer}/status`, idx: 0 } };
    fixture.statusListResponse = new Response(await createStatusListJwt(0));
    const credential = await fixture.receive();
    const token = await fixture.holder.createPresentationTokenContent(credential.content.value, "token-id");
    fixture.statusListResponse = new Response(await createStatusListJwt(1));

    // Act
    const result = await fixture.holder.verifyPresentationTokenContent(token, "token-id");

    // Assert
    expect(result).toMatchObject({ isValid: false, error: { message: expect.stringMatching(/status|revoked/i) } });
});

test("rejects a status list with an invalid signature", async () => {
    // Arrange
    fixture.credentialStatus = { status_list: { uri: `${issuer}/status`, idx: 0 } };
    fixture.statusListResponse = new Response(await createStatusListJwt(0));
    const credential = await fixture.receive();
    const token = await fixture.holder.createPresentationTokenContent(credential.content.value, "token-id");
    const [header, payload, signature] = (await createStatusListJwt(0)).split(".");
    const bytes = base64url.decode(signature);
    bytes[0] ^= 1;
    fixture.statusListResponse = new Response(`${header}.${payload}.${base64url.encode(bytes)}`);

    // Act
    const result = await fixture.holder.verifyPresentationTokenContent(token, "token-id");

    // Assert
    expect(result).toMatchObject({ isValid: false, error: { message: expect.stringMatching(/Status List JWT verification failed/i) } });
});

test("reports a status list retrieval failure", async () => {
    // Arrange
    fixture.credentialStatus = { status_list: { uri: `${issuer}/status`, idx: 0 } };
    fixture.statusListResponse = new Response(await createStatusListJwt(0));
    const credential = await fixture.receive();
    const token = await fixture.holder.createPresentationTokenContent(credential.content.value, "token-id");
    fixture.statusListResponse = new Response("unavailable", { status: 503 });

    // Act
    const result = await fixture.holder.verifyPresentationTokenContent(token, "token-id");

    // Assert
    expect(result).toMatchObject({ isValid: false, error: { message: "Verify Error: Unable to fetch status list: HTTP 503" } });
});

test("rejects an expired status list", async () => {
    // Arrange
    fixture.credentialStatus = { status_list: { uri: `${issuer}/status`, idx: 0 } };
    fixture.statusListResponse = new Response(await createStatusListJwt(0));
    const credential = await fixture.receive();
    const token = await fixture.holder.createPresentationTokenContent(credential.content.value, "token-id");
    fixture.statusListResponse = new Response(await createStatusListJwt(0, { exp: Math.floor(Date.now() / 1000) - 60 }));

    // Act
    const result = await fixture.holder.verifyPresentationTokenContent(token, "token-id");

    // Assert
    expect(result).toMatchObject({ isValid: false, error: { message: expect.stringMatching(/Status List JWT verification failed|expired/i) } });
});

test("recovers a holder key from a legacy JSON record after restart", async () => {
    // Arrange
    const credential = await fixture.receive();
    const [id, entry] = [...fixture.keyEntries][0];
    fixture.keyEntries.delete(id);
    fixture.keyEntries.set("legacy-key-id", { ...entry, id: "legacy-key-id", key: JSON.stringify(entry.key) });
    fixture.holder = fixture.restart();

    // Act
    const token = await fixture.holder.createPresentationTokenContent(credential.content.value, "token-id");

    // Assert
    const verified = await jwtVerify((token.value as string).split("~").at(-1)!, await importJWK(fixture.issuedKey, "ES256"));
    expect(verified.payload.nonce).toBe("token-id");
});

async function createStatusListJwt(status: number, claims: Record<string, unknown> = {}) {
    return await new SignJWT({
        iss: issuer,
        sub: `${issuer}/status`,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        status_list: { bits: 1, lst: base64url.encode(deflateSync(Uint8Array.of(status))) },
        ...claims
    })
        .setProtectedHeader({ alg: "ES256", typ: "statuslist+jwt", kid: "issuer-key" })
        .sign(await importJWK(fixture.issuerKey, "ES256"));
}

test("matches DCQL wildcard array paths", async () => {
    // Arrange
    fixture.names = ["Alice", "Bob"];
    const credential = await fixture.receive();
    const request = await fixture.request();
    request.authorizationRequestPayload.dcql_query!.credentials = [
        { id: "credential", format: "dc+sd-jwt", meta: { vct_values: [vct] }, claims: [{ path: ["names", null], values: ["Bob"] }] }
    ];

    // Act
    const result = await fixture.holder.acceptAuthorizationRequest(request, credential);

    // Assert
    expect(result.status).toBe(200);
    const verifier = new SDJwtVcInstance({
        hasher: (data, algorithm) => fixture.crypto.hash(typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data), algorithm)
    });
    expect((await verifier.getClaims(fixture.submitted.vp_token.credential[0])).names).toEqual(["Bob"]);
});

test("rejects a SAN DNS request with a conflicting response URI", async () => {
    // Arrange
    await fixture.request();
    fixture.presentationRequest.response_uri = "https://another-verifier.example/response";
    const url = `openid4vp://?client_id=x509_san_dns%3Averifier.example&request_uri=${encodeURIComponent(`${verifier}/request`)}`;

    // Act
    const result = fixture.holder.resolveAuthorizationRequest(url);

    // Assert
    await expect(result).rejects.toThrow(/fully qualified domain name/i);
});

test.each(["ECDH-ES", "ECDH-ES+A256KW", "RSA-OAEP-256"])("encrypts a Final 1.0 response using %s", async (algorithm) => {
    // Arrange
    fixture.encryptionAlgorithm = algorithm;
    const credential = await fixture.receive();
    const request = await fixture.request("direct_post.jwt");

    // Act
    const result = await fixture.holder.acceptAuthorizationRequest(request, credential);

    // Assert
    expect(result.status).toBe(200);
    expect(fixture.submittedEncryptionHeader).toMatchObject({ alg: algorithm, enc: "A256GCM" });
    expect(JSON.parse(fixture.submittedPlaintext!)).toEqual({ state: "state", vp_token: { credential: [expect.any(String)] } });
});

test("resolves response encryption keys from jwks_uri", async () => {
    // Arrange
    const credential = await fixture.receive();
    const request = await fixture.request("direct_post.jwt");
    delete request.authorizationRequestPayload.client_metadata!.jwks;
    request.authorizationRequestPayload.client_metadata!.jwks_uri = `${verifier}/jwks`;

    // Act
    const result = await fixture.holder.acceptAuthorizationRequest(request, credential);

    // Assert
    expect(result.status).toBe(200);
    expect(fixture.requests).toContainEqual({ url: `${verifier}/jwks` });
    expect(fixture.submittedEncryptionHeader).toMatchObject({ alg: "ECDH-ES", kid: "verifier-key" });
});

test("uses A128GCM when no response enc preference is advertised", async () => {
    // Arrange
    const credential = await fixture.receive();
    const request = await fixture.request("direct_post.jwt");
    delete request.authorizationRequestPayload.client_metadata!.encrypted_response_enc_values_supported;

    // Act
    const result = await fixture.holder.acceptAuthorizationRequest(request, credential);

    // Assert
    expect(result.status).toBe(200);
    expect(fixture.submittedEncryptionHeader).toMatchObject({ enc: "A128GCM" });
});

test("rejects an encrypted response request without an encryption key", async () => {
    // Arrange
    const credential = await fixture.receive();
    const request = await fixture.request("direct_post.jwt");
    request.authorizationRequestPayload.client_metadata!.jwks = { keys: [] };

    // Act
    const result = fixture.holder.acceptAuthorizationRequest(request, credential);

    // Assert
    await expect(result).rejects.toThrow(/No encryption JWK|encryption.*key/i);
    expect(fixture.requests).not.toContainEqual({ url: `${verifier}/response` });
});

test("does not use a signing-only key for response encryption", async () => {
    // Arrange
    const credential = await fixture.receive();
    const request = await fixture.request("direct_post.jwt");
    request.authorizationRequestPayload.client_metadata!.jwks!.keys[0].use = "sig";

    // Act
    const result = fixture.holder.acceptAuthorizationRequest(request, credential);

    // Assert
    await expect(result).rejects.toThrow(/No encryption JWK|encryption.*key/i);
    expect(fixture.requests).not.toContainEqual({ url: `${verifier}/response` });
});

test("rejects an unsupported response content encryption algorithm", async () => {
    // Arrange
    const credential = await fixture.receive();
    const request = await fixture.request("direct_post.jwt");
    request.authorizationRequestPayload.client_metadata!.encrypted_response_enc_values_supported = ["unsupported"];

    // Act
    const result = fixture.holder.acceptAuthorizationRequest(request, credential);

    // Assert
    await expect(result).rejects.toThrow(/Invalid 'enc' value/);
    expect(fixture.requests).not.toContainEqual({ url: `${verifier}/response` });
});

test("uses the authorization server explicitly selected by the credential offer", async () => {
    // Arrange
    const offer = await fixture.holder.resolveCredentialOffer(`openid-credential-offer://?credential_offer_uri=${encodeURIComponent(`${issuer}/offer`)}`);
    const selected = `${issuer}/selected`;
    const unused = `${issuer}/unused`;
    const issuerMetadata = { ...offer.metadata.credentialIssuer, authorization_servers: [unused, selected] };
    fixture.extraResponses.set(`${issuer}/.well-known/openid-credential-issuer`, new Response(JSON.stringify(issuerMetadata), { headers: { "content-type": "application/json" } }));
    fixture.extraResponses.set(
        `${issuer}/.well-known/oauth-authorization-server/selected`,
        new Response(JSON.stringify({ issuer: selected, token_endpoint: `${selected}/token`, grant_types_supported: ["urn:ietf:params:oauth:grant-type:pre-authorized_code"] }), {
            headers: { "content-type": "application/json" }
        })
    );
    fixture.extraResponses.set(
        `${issuer}/.well-known/oauth-authorization-server/unused`,
        new Response(JSON.stringify({ issuer: unused, token_endpoint: `${unused}/token`, grant_types_supported: ["urn:ietf:params:oauth:grant-type:pre-authorized_code"] }), {
            headers: { "content-type": "application/json" }
        })
    );
    fixture.extraResponses.set(
        `${selected}/token`,
        new Response(JSON.stringify({ access_token: "selected-token", token_type: "Bearer" }), { headers: { "content-type": "application/json" } })
    );
    offer.credentialOfferPayload.grants!["urn:ietf:params:oauth:grant-type:pre-authorized_code"]!.authorization_server = selected;

    // Act
    const result = await fixture.holder.requestCredentials(offer, ["test"], {});

    // Assert
    expect(result).toHaveLength(1);
    expect(fixture.accessTokens).toEqual(["Bearer selected-token"]);
    expect(fixture.requests).not.toContainEqual({ url: `${unused}/token` });
});

test("binds a presentation to an x509_san_uri client identifier", async () => {
    // Arrange
    fixture.requestClientId = `x509_san_uri:${verifier}/response`;
    fixture.issuerCertificate = await X509CertificateGenerator.createSelfSigned({
        name: "CN=URI Verifier",
        serialNumber: "03",
        notBefore: new Date("2020-01-01"),
        notAfter: new Date("2040-01-01"),
        signingAlgorithm: { name: "ECDSA", hash: "SHA-256" },
        keys: { privateKey: await importAsymmetricKey(fixture.issuerKey, "ES256"), publicKey: await importAsymmetricKey(fixture.issuerPublicKey, "ES256") },
        extensions: [new SubjectAlternativeNameExtension([{ type: "url", value: `${verifier}/response` }])]
    });
    const credential = await fixture.receive();
    const request = await fixture.request();

    // Act
    const result = await fixture.holder.acceptAuthorizationRequest(request, credential);

    // Assert
    expect(result.status).toBe(200);
    const keyBindingJwt = fixture.submitted.vp_token.credential[0].split("~").at(-1)!;
    const verified = await jwtVerify(keyBindingJwt, await importJWK(fixture.issuedKey, "ES256"), { audience: fixture.requestClientId });
    expect(verified.payload.nonce).toBe("verifier-nonce");
});

test("rejects encryption keys whose key_ops permit only verification", async () => {
    // Arrange
    const credential = await fixture.receive();
    const request = await fixture.request("direct_post.jwt");
    request.authorizationRequestPayload.client_metadata!.jwks!.keys[0].key_ops = ["verify"];

    // Act
    const result = fixture.holder.acceptAuthorizationRequest(request, credential);

    // Assert
    await expect(result).rejects.toThrow(/No suitable response encryption key/);
    expect(fixture.requests).not.toContainEqual({ url: `${verifier}/response` });
});
