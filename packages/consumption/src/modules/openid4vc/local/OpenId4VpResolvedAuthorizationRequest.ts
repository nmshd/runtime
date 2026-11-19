/* eslint-disable @typescript-eslint/naming-convention -- Standard OpenID4VC and DCQL field names. */
import type { OpenId4VcJsonObject } from "@nmshd/content";
import type { OpenId4VpClientMetadata } from "./OpenId4VpClientMetadata";
import type { OpenId4VpDcqlQuery } from "./OpenId4VpDcqlQuery";

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
