import { ClaimFormat, W3cJsonCredential } from "@credo-ts/core";
import { OpenId4VciCredentialConfigurationSupportedWithFormats } from "@credo-ts/openid4vc";

export interface OpenId4VciCredentialResponseJSON {
    credentialConfigurationId: string;
    credentialConfiguration: OpenId4VciCredentialConfigurationSupportedWithFormats;
    record: { claimFormat: ClaimFormat; encoded: string | W3cJsonCredential };
    notificationId?: string;
}
