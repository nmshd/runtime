/* eslint-disable @typescript-eslint/naming-convention -- Standard OpenID4VC and DCQL field names. */
import type { OpenId4VcDisplayInformation } from "@nmshd/content";
import type { OpenId4VciCredentialConfiguration } from "./OpenId4VciCredentialConfiguration";

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
