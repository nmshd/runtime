/* eslint-disable @typescript-eslint/naming-convention -- OpenID4VC and DCQL use standardized field names. */
import {
    IdentityAttribute,
    OpenId4VcJsonValue,
    OpenId4VcCredentialFormat,
    OpenId4VciCredentialResponseJSON,
    OpenId4VciResolvedCredentialOffer,
    OpenId4VpResolvedAuthorizationRequest,
    TokenContentVerifiablePresentation,
    VerifiableCredential
} from "@nmshd/content";
import { AccountController } from "@nmshd/transport";
import { JwtSigner, setGlobalConfig as setOauthConfig, zJwkSet } from "@openid4vc/oauth2";
import { Openid4vciClient, setGlobalConfig as setIssuanceConfig } from "@openid4vc/openid4vci";
import { extractEncryptionJwkFromJwks, Openid4vpClient, zClientMetadata } from "@openid4vc/openid4vp";
import { setGlobalConfig as setPresentationConfig } from "@openid4vc/utils";
import { SDJWTException } from "@sd-jwt/core";
import { DcqlQuery } from "dcql";
import { base64url, errors } from "jose";
import { parse } from "valibot";
import { z } from "zod";
import { AttributesController, OwnIdentityAttribute } from "../../attributes";
import { CredentialFormats } from "./CredentialFormats";
import { KeyStorage } from "./KeyStorage";
import { OpenId4VcCrypto } from "./OpenId4VcCrypto";
import { displayInformationSchema } from "./OpenId4VcSchemas";
import { isVerifiableCredentialAttribute, OwnIdentityAttributeWithVerifiableCredential } from "./VerifiableCredentialAttribute";

function isSupportedFormat(format: string): format is OpenId4VcCredentialFormat {
    return format === "dc+sd-jwt" || format === "mso_mdoc" || format === "jwt_vc_json";
}
const authorizationPayloadSchema = z
    .object({
        client_id: z.string(),
        nonce: z.string(),
        response_type: z.literal("vp_token"),
        response_mode: z.enum(["direct_post", "direct_post.jwt"]).optional(),
        response_uri: z.string().optional(),
        state: z.string().optional(),
        client_metadata: zClientMetadata.optional()
    })
    .loose();

export class Holder {
    private readonly cryptography: OpenId4VcCrypto;
    private readonly formats: CredentialFormats;
    private readonly issuanceClient: Openid4vciClient;
    private readonly presentationClient: Openid4vpClient;

    public constructor(
        keyStorage: KeyStorage,
        private readonly accountController: AccountController,
        private readonly attributeController: AttributesController,
        fetchInstance: typeof fetch
    ) {
        // Keep local HTTP issuers/verifiers working, as with the former holder configuration.
        setOauthConfig({ allowInsecureUrls: true });
        setIssuanceConfig({ allowInsecureUrls: true });
        setPresentationConfig({ allowInsecureUrls: true });
        this.cryptography = new OpenId4VcCrypto(keyStorage, fetchInstance);
        this.formats = new CredentialFormats(this.cryptography, fetchInstance);
        this.issuanceClient = new Openid4vciClient({ callbacks: this.cryptography.callbacks });
        this.presentationClient = new Openid4vpClient({ callbacks: this.cryptography.callbacks });
    }

    public async resolveCredentialOffer(credentialOffer: string): Promise<OpenId4VciResolvedCredentialOffer> {
        const credentialOfferPayload = await this.issuanceClient.resolveCredentialOffer(credentialOffer);
        const metadata = await this.issuanceClient.resolveIssuerMetadata(credentialOfferPayload.credential_issuer);
        return { credentialOfferPayload, metadata: { credentialIssuer: metadata.credentialIssuer, authorizationServers: metadata.authorizationServers } };
    }

    public async requestCredentials(
        offer: OpenId4VciResolvedCredentialOffer,
        credentialConfigurationIds: string[],
        access: { accessToken: string } | { pinCode?: string }
    ): Promise<OpenId4VciCredentialResponseJSON[]> {
        if (!credentialConfigurationIds.length) throw new Error("At least one credential configuration is required");
        // Re-resolve protocol metadata, rather than trusting caller-provided metadata or exposing library state.
        const issuerMetadata = await this.issuanceClient.resolveIssuerMetadata(offer.credentialOfferPayload.credential_issuer);
        for (const id of credentialConfigurationIds) {
            const configuration = issuerMetadata.knownCredentialConfigurations[id];
            if (!offer.credentialOfferPayload.credential_configuration_ids.includes(id) || !Object.hasOwn(issuerMetadata.knownCredentialConfigurations, id)) {
                throw new Error(`Unknown credential configuration: ${id}`);
            }
            if (!isSupportedFormat(configuration.format)) throw new Error(`Unsupported credential format: ${configuration.format}`);
        }
        const token =
            "accessToken" in access
                ? { access_token: access.accessToken, c_nonce: undefined }
                : (
                      await this.issuanceClient.retrievePreAuthorizedCodeAccessTokenFromOffer({
                          credentialOffer: offer.credentialOfferPayload,
                          issuerMetadata,
                          txCode: access.pinCode
                      })
                  ).accessTokenResponse;
        const responses: OpenId4VciCredentialResponseJSON[] = [];
        for (const id of credentialConfigurationIds) {
            const configuration = issuerMetadata.knownCredentialConfigurations[id];
            const format = configuration.format;
            if (!isSupportedFormat(format)) throw new Error(`Unsupported credential format: ${format}`);
            if (configuration.proof_types_supported && !Object.hasOwn(configuration.proof_types_supported, "jwt")) throw new Error("Only JWT credential proofs are supported");
            const algorithms =
                configuration.proof_types_supported?.jwt.proof_signing_alg_values_supported ?? (configuration.format === "mso_mdoc" ? ["ES256", "EdDSA"] : ["EdDSA", "ES256"]);
            const publicJwk = await this.cryptography.createKeyForAlgorithms(algorithms);
            const algorithm = this.cryptography.algorithm(publicJwk);
            const bindingMethods = configuration.cryptographic_binding_methods_supported;
            let signer: JwtSigner;
            if (bindingMethods?.includes("did:key") || bindingMethods?.includes("did")) {
                signer = { method: "did", alg: algorithm, didUrl: this.cryptography.didForKey(publicJwk, "key") };
            } else if (bindingMethods?.includes("did:jwk")) {
                signer = { method: "did", alg: algorithm, didUrl: this.cryptography.didForKey(publicJwk, "jwk") };
            } else {
                if (bindingMethods?.length && !bindingMethods.some((method) => ["jwk", "cose_key"].includes(method))) throw new Error("Unsupported credential binding method");
                signer = { method: "jwk", alg: algorithm, publicJwk };
            }
            const nonce = issuerMetadata.credentialIssuer.nonce_endpoint ? (await this.issuanceClient.requestNonce({ issuerMetadata })).c_nonce : token.c_nonce;
            const proof = await this.issuanceClient.createCredentialRequestJwtProof({ issuerMetadata, credentialConfigurationId: id, signer, nonce, clientId: "wallet" });
            const { credentialResponse } = await this.issuanceClient.retrieveCredentials({
                issuerMetadata,
                credentialConfigurationId: id,
                accessToken: token.access_token,
                proof: { proof_type: "jwt", jwt: proof.jwt }
            });
            const credentials = credentialResponse.credentials ?? (credentialResponse.credential ? [credentialResponse.credential] : []);
            if (!credentials.length) throw new Error("Issuer did not return credentials; deferred issuance is not supported");
            if (credentials.length !== 1) throw new Error("Issuer returned multiple credentials for one holder key");
            for (const entry of credentials) {
                const encoded = typeof entry === "object" && "credential" in entry ? entry.credential : entry;
                if (typeof encoded !== "string") throw new Error("Unsupported credential encoding");
                const response: OpenId4VciCredentialResponseJSON = {
                    claimFormat: format,
                    encoded,
                    displayInformation: displayInformationSchema.parse(configuration.credential_metadata?.display ?? configuration.display)
                };
                await this.formats.assertHolderBinding(VerifiableCredential.from({ value: encoded, type: response.claimFormat }), publicJwk);
                responses.push(response);
            }
        }
        await this.accountController.syncDatawallet();
        return responses;
    }

    public async storeCredentials(responses: OpenId4VciCredentialResponseJSON[]): Promise<OwnIdentityAttributeWithVerifiableCredential[]> {
        if (!responses.length) throw new Error("At least one credential is required");
        // Validate the entire batch before creating any attributes.
        const contents = responses.map((response) =>
            VerifiableCredential.from({
                value: response.encoded,
                type: response.claimFormat,
                displayInformation: response.displayInformation,
                displayInformationCachedImages: response.displayInformationCachedImages
            })
        );
        await Promise.all(contents.map((content) => this.formats.decode(content)));
        return await Promise.all(
            contents.map(async (value) => {
                const attribute = await this.attributeController.createOwnIdentityAttribute({
                    content: IdentityAttribute.from({ owner: this.accountController.identity.address, value })
                });
                if (!isVerifiableCredentialAttribute(attribute)) throw new Error("Stored attribute does not contain a verifiable credential");
                return attribute;
            })
        );
    }

    private query(request: OpenId4VpResolvedAuthorizationRequest): DcqlQuery.Output {
        const payload = request.authorizationRequestPayload;
        if (payload.presentation_definition || payload.presentation_definition_uri) throw new Error("Presentation Exchange is not supported");
        if (payload.transaction_data) throw new Error("Transaction data is not supported");
        if (!["direct_post", "direct_post.jwt"].includes(payload.response_mode ?? "")) throw new Error("Unsupported presentation response mode");
        const query = parse(DcqlQuery.vModel, payload.dcql_query);
        if (query.credentials.length !== 1 || query.credentials[0].multiple) throw new Error("Exactly one credential query is supported");
        if (!isSupportedFormat(query.credentials[0].format)) throw new Error("Unsupported presentation credential format");
        DcqlQuery.validate(query);
        return query;
    }

    public async resolveAuthorizationRequest(request: string): Promise<OpenId4VpResolvedAuthorizationRequest> {
        const parsed = this.presentationClient.parseOpenid4vpAuthorizationRequest({ authorizationRequest: request });
        if (parsed.type === "openid4vp_dc_api" || parsed.type === "openid4vp_iae") throw new Error("Unsupported presentation request type");
        const resolved = await this.presentationClient.resolveOpenId4vpAuthorizationRequest({ authorizationRequestPayload: parsed.params, responseMode: { type: "direct_post" } });
        const payload = authorizationPayloadSchema.parse(resolved.authorizationRequestPayload);
        if (payload.presentation_definition || payload.presentation_definition_uri) throw new Error("Presentation Exchange is not supported");
        if (payload.transaction_data) throw new Error("Transaction data is not supported");
        const result: OpenId4VpResolvedAuthorizationRequest = {
            authorizationRequestPayload: { ...payload, dcql_query: parse(DcqlQuery.vModel, payload.dcql_query) },
            version: resolved.version
        };
        this.query(result);
        return result;
    }

    public async matchingCredentials(request: OpenId4VpResolvedAuthorizationRequest): Promise<OwnIdentityAttributeWithVerifiableCredential[]> {
        const query = this.query(request);
        const attributes = await this.attributeController.getLocalAttributes({
            "@type": "OwnIdentityAttribute",
            "content.value.@type": "VerifiableCredential"
        });
        const matching: OwnIdentityAttributeWithVerifiableCredential[] = [];
        for (const attribute of attributes) {
            if (!isVerifiableCredentialAttribute(attribute)) continue;
            try {
                const decoded = await this.formats.decode(attribute.content.value);
                if (DcqlQuery.query(query, [decoded.dcql]).can_be_satisfied) matching.push(attribute);
            } catch {
                // Unsupported, malformed, expired credentials and credentials without a holder key cannot be presented.
            }
        }
        return matching;
    }

    public async acceptAuthorizationRequest(
        request: OpenId4VpResolvedAuthorizationRequest,
        credential: OwnIdentityAttribute
    ): Promise<{ status: number; body: OpenId4VcJsonValue }> {
        const query = this.query(request);
        if (!isVerifiableCredentialAttribute(credential)) throw new Error("The selected attribute does not contain a verifiable credential");
        const content = credential.content.value;
        const decoded = await this.formats.decode(content);
        const result = DcqlQuery.query(query, [decoded.dcql]);
        const queryId = query.credentials[0].id;
        const matches = result.credential_matches[queryId];
        if (!result.can_be_satisfied || !matches.success) throw new Error("The selected credential does not match the query");
        const payload = request.authorizationRequestPayload;
        const clientMetadata = payload.client_metadata;
        const jwks = clientMetadata?.jwks ?? (clientMetadata?.jwks_uri ? zJwkSet.parse(await this.cryptography.fetchJson(clientMetadata.jwks_uri)) : undefined);
        const encryptionKey =
            payload.response_mode === "direct_post.jwt" && jwks
                ? extractEncryptionJwkFromJwks(jwks, { supportedAlgValues: ["ECDH-ES", "ECDH-ES+A256KW", "RSA-OAEP-256"] })
                : undefined;
        const mdocGeneratedNonce = base64url.encode(crypto.getRandomValues(new Uint8Array(16)));
        const presentation = await this.formats.present(content, request, matches.valid_credentials[0], encryptionKey, mdocGeneratedNonce);
        const response = await this.presentationClient.createOpenid4vpAuthorizationResponse({
            authorizationRequestPayload: payload,
            authorizationResponsePayload: { vp_token: { [queryId]: [presentation] } },
            jarm:
                payload.response_mode === "direct_post.jwt"
                    ? {
                          encryption: { nonce: mdocGeneratedNonce, jwk: encryptionKey },
                          jwtSigner: clientMetadata?.authorization_signed_response_alg
                              ? { method: "jwk", publicJwk: decoded.holderKey, alg: this.cryptography.algorithm(decoded.holderKey) }
                              : undefined,
                          authorizationServer: "wallet",
                          audience: payload.client_id,
                          serverMetadata: {
                              authorization_signing_alg_values_supported: ["EdDSA", "ES256"],
                              authorization_encryption_alg_values_supported: ["ECDH-ES", "ECDH-ES+A256KW", "RSA-OAEP-256"],
                              authorization_encryption_enc_values_supported: ["A128GCM", "A256GCM"]
                          }
                      }
                    : undefined
        });
        const submitted = await this.presentationClient.submitOpenid4vpAuthorizationResponse({ authorizationRequestPayload: payload, ...response });
        const text = await submitted.response.text();
        let body: OpenId4VcJsonValue = text || null;
        try {
            body = text ? z.json().parse(JSON.parse(text)) : null;
        } catch {
            /* Plain text responses are also valid. */
        }
        return { status: submitted.response.status, body };
    }

    public async createPresentationTokenContent(credential: VerifiableCredential, nonce: string): Promise<TokenContentVerifiablePresentation> {
        if (credential.type !== "dc+sd-jwt") throw new Error("Only SD-JWT credentials are supported for token presentation");
        if (typeof credential.value !== "string") throw new Error("Credential must be encoded as a string");
        const { holderKey } = await this.formats.decode(credential);
        const value = await this.formats
            .sdJwt(holderKey)
            .present(credential.value, undefined, { kb: { payload: { aud: "defaultPresentationAudience", nonce, iat: Math.floor(Date.now() / 1000) } } });
        return TokenContentVerifiablePresentation.from({ value, type: credential.type, displayInformation: credential.displayInformation });
    }

    public async verifyPresentationTokenContent(content: TokenContentVerifiablePresentation, expectedNonce: string): Promise<{ isValid: boolean; error?: Error }> {
        if (content.type !== "dc+sd-jwt") throw new Error("Only SD-JWT credentials are supported for token presentation");
        try {
            if (typeof content.value !== "string") throw new Error("Invalid presentation encoding");
            await this.formats.sdJwt().verify(content.value, { keyBindingNonce: expectedNonce, expectedKeyBindingAudience: "defaultPresentationAudience", skewSeconds: 30 });
            return { isValid: true };
        } catch (cause) {
            const code = cause instanceof SDJWTException || cause instanceof errors.JOSEError ? cause.code : undefined;
            let message = cause instanceof Error ? cause.message : "Invalid presentation";
            switch (code) {
                case "INVALID_JWT_SIGNATURE":
                case "KEY_BINDING_SIGNATURE_INVALID":
                case "ERR_JWS_SIGNATURE_VERIFICATION_FAILED":
                    message = "Verify Error: Invalid JWT Signature";
                    break;
                case "INVALID_AUDIENCE":
                    message = "Verify Error: Invalid Audience";
                    break;
                case "JWT_EXPIRED":
                case "KEY_BINDING_JWT_EXPIRED":
                case "ERR_JWT_EXPIRED":
                    message = "Verify Error: Expired JWT";
                    break;
                case "JWT_NOT_YET_VALID":
                case "KEY_BINDING_JWT_NOT_YET_VALID":
                    message = "Verify Error: JWT Not Yet Valid";
                    break;
                case "JWT_TOO_OLD":
                case "KEY_BINDING_JWT_TOO_OLD":
                    message = "Verify Error: JWT Too Old";
                    break;
                case "KEY_BINDING_JWT_MISSING":
                    message = "Verify Error: Missing Key Binding JWT";
                    break;
                case "KEY_BINDING_SD_HASH_INVALID":
                    message = "Verify Error: Invalid SD Hash";
                    break;
                default:
                    break;
            }
            // SD-JWT 0.22 has no error codes for these key-binding failures.
            if (cause instanceof SDJWTException && !code) {
                switch (message) {
                    case "Verify Error: Invalid Key Binding audience":
                        message = "Verify Error: Invalid Audience";
                        break;
                    case "Key Binding JWT not exist":
                        message = "Verify Error: Missing Key Binding JWT";
                        break;
                    case "Invalid sd_hash in Key Binding JWT":
                        message = "Verify Error: Invalid SD Hash";
                        break;
                }
            }
            const error = new Error(message.startsWith("Verify Error: ") ? message : `Verify Error: ${message}`);
            error.name = "PresentationVerificationError";
            return { isValid: false, error };
        }
    }
}
