/* eslint-disable @typescript-eslint/naming-convention -- Standard OpenID4VC and DCQL field names. */
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
