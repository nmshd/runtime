/* eslint-disable @typescript-eslint/naming-convention -- Standard OpenID4VC and DCQL field names. */
import type { OpenId4VcDisplayInformation, OpenId4VcJsonObject } from "@nmshd/content";

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
