import type { DisplayInformationCachedImagesJSON, OpenId4VcDisplayInformation } from "@nmshd/content";
import type { OpenId4VcCredentialFormat } from "./OpenId4VcCredentialFormat";

export interface OpenId4VciCredentialResponseJSON {
    claimFormat: OpenId4VcCredentialFormat;
    encoded: string;
    displayInformation?: OpenId4VcDisplayInformation[];
    displayInformationCachedImages?: DisplayInformationCachedImagesJSON[];
}
