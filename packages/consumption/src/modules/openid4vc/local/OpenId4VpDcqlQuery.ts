/* eslint-disable @typescript-eslint/naming-convention -- Standard OpenID4VC and DCQL field names. */
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
