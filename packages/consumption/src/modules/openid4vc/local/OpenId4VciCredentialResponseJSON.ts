import { ClaimFormat, W3cJsonCredential } from "@credo-ts/core";

export interface OpenId4VciCredentialResponseJSON {
    claimFormat: ClaimFormat;
    encoded: string | W3cJsonCredential;
    displayInformation?: Record<string, any>[];
}
