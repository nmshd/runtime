/* eslint-disable @typescript-eslint/naming-convention -- Standard OpenID4VC and DCQL field names. */
import type { OpenId4VcJwk } from "./OpenId4VcJwk";

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
