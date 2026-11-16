/* eslint-disable @typescript-eslint/naming-convention -- Standard OpenID4VC and DCQL field names. */
import type { OpenId4VciIssuerMetadata } from "./OpenId4VciIssuerMetadata";

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
