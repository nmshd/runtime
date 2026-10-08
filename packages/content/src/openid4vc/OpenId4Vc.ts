/* eslint-disable @typescript-eslint/naming-convention -- OpenID4VC and DCQL use standardized field names. */
import type { DisplayInformationCachedImagesJSON } from "../attributes";

export type OpenId4VcCredentialFormat = "dc+sd-jwt" | "mso_mdoc" | "jwt_vc_json";

export interface OpenId4VpDcqlJsonClaimQuery {
    id?: string;
    path: (string | number | null)[];
    values?: (string | number | boolean)[];
}

interface OpenId4VpDcqlCredentialQueryBase {
    id: string;
    require_cryptographic_holder_binding?: boolean;
    multiple?: boolean;
    claim_sets?: string[][];
    trusted_authorities?: { type: "aki" | "etsi_tl" | "openid_federation"; values: string[] }[];
}

export type OpenId4VpDcqlCredentialQuery = OpenId4VpDcqlCredentialQueryBase &
    (
        | {
              format: "mso_mdoc";
              meta?: { doctype_value?: string };
              claims?: (
                  | { id?: string; path: [string, string]; values?: (string | number | boolean)[]; intent_to_retain?: boolean }
                  | { id?: string; namespace: string; claim_name: string; values?: (string | number | boolean)[] }
              )[];
          }
        | {
              format: "dc+sd-jwt" | "vc+sd-jwt";
              meta?: { vct_values?: string[] };
              claims?: OpenId4VpDcqlJsonClaimQuery[];
          }
        | {
              format: "jwt_vc_json" | "ldp_vc" | "vc+sd-jwt";
              meta: { type_values: string[][] };
              claims?: OpenId4VpDcqlJsonClaimQuery[];
          }
    );

/** Plain protocol data; dcql validates cardinalities, identifiers and references. */
export interface OpenId4VpDcqlQuery {
    credentials: OpenId4VpDcqlCredentialQuery[];
    credential_sets?: { options: string[][]; required?: boolean; purpose?: string | number | Record<string, unknown> }[];
}

export type OpenId4VcJsonValue = string | number | boolean | null | OpenId4VcJsonObject | OpenId4VcJsonValue[];
export interface OpenId4VcJsonObject {
    [key: string]: OpenId4VcJsonValue;
}

export interface OpenId4VcDisplayInformation {
    name?: string;
    locale?: string;
    lang?: string;
    description?: string;
    logo?: string | { uri?: string; alt_text?: string };
    backgroundImage?: string | { uri?: string };
    background_image?: string | { uri?: string };
    background_color?: string;
    text_color?: string;
    [key: string]: unknown;
}

/** Standard JWK fields; private key material is rejected at public-key boundaries. */
export interface OpenId4VcJwk {
    [key: string]: unknown;
    kty: string;
    crv?: string;
    x?: string;
    y?: string;
    n?: string;
    e?: string;
    d?: string;
    k?: string;
    p?: string;
    q?: string;
    dp?: string;
    dq?: string;
    qi?: string;
    alg?: string;
    kid?: string;
    use?: string;
    key_ops?: string[];
    ext?: boolean;
    x5c?: string[];
    x5u?: string;
    x5t?: string;
    "x5t#S256"?: string;
    oth?: { d?: string; r?: string; t?: string }[];
}

export interface OpenId4VciCredentialConfiguration {
    format: string;
    scope?: string;
    vct?: string;
    doctype?: string;
    credential_definition?: { "@context"?: string[]; type: string[]; credentialSubject?: OpenId4VcJsonObject };
    cryptographic_binding_methods_supported?: string[];
    credential_signing_alg_values_supported?: string[] | number[];
    proof_types_supported?: Record<string, { proof_signing_alg_values_supported: string[]; [key: string]: unknown }>;
    display?: OpenId4VcDisplayInformation[];
    credential_metadata?: { display?: OpenId4VcDisplayInformation[]; [key: string]: unknown };
    [key: string]: unknown;
}

export interface OpenId4VciIssuerMetadata {
    credential_issuer: string;
    credential_endpoint: string;
    credential_configurations_supported: Record<string, OpenId4VciCredentialConfiguration>;
    nonce_endpoint?: string;
    deferred_credential_endpoint?: string;
    notification_endpoint?: string;
    authorization_servers?: string[];
    display?: OpenId4VcDisplayInformation[];
    credential_metadata?: { display?: OpenId4VcDisplayInformation[]; [key: string]: unknown };
    [key: string]: unknown;
}

export interface OpenId4VpClientMetadata {
    jwks?: { keys: OpenId4VcJwk[] };
    jwks_uri?: string;
    authorization_signed_response_alg?: string;
    authorization_encrypted_response_alg?: string;
    authorization_encrypted_response_enc?: string;
    encrypted_response_enc_values_supported?: string[];
    vp_formats?: Record<string, { alg_values_supported?: string[] }>;
    [key: string]: unknown;
}

/** JSON data exchanged between resolving an offer and requesting its credentials. */
export interface OpenId4VciResolvedCredentialOffer {
    credentialOfferPayload: {
        credential_issuer: string;
        credential_configuration_ids: string[];
        grants?: {
            authorization_code?: { authorization_server?: string; issuer_state?: string };
            "urn:ietf:params:oauth:grant-type:pre-authorized_code"?: {
                "pre-authorized_code": string;
                authorization_server?: string;
                tx_code?: { input_mode?: "numeric" | "text"; length?: number; description?: string };
            };
        };
        [key: string]: unknown;
    };
    metadata: {
        credentialIssuer: OpenId4VciIssuerMetadata;
        authorizationServers: { issuer: string; token_endpoint: string; [key: string]: unknown }[];
    };
}

/** Validated OpenID4VP payload, without library records or credential matches. */
export interface OpenId4VpResolvedAuthorizationRequest {
    authorizationRequestPayload: {
        client_id: string;
        nonce: string;
        response_type: "vp_token";
        response_mode?: "direct_post" | "direct_post.jwt";
        response_uri?: string;
        client_metadata?: OpenId4VpClientMetadata;
        dcql_query?: OpenId4VpDcqlQuery;
        presentation_definition?: OpenId4VcJsonObject;
        presentation_definition_uri?: string;
        transaction_data?: string[];
        state?: string;
        [key: string]: unknown;
    };
    version: number;
}

export interface OpenId4VciCredentialResponseJSON {
    claimFormat: OpenId4VcCredentialFormat;
    encoded: string;
    displayInformation?: OpenId4VcDisplayInformation[];
    displayInformationCachedImages?: DisplayInformationCachedImagesJSON[];
}
