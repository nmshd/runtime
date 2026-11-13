import type { OpenId4VcJsonValue } from "./OpenId4VcJsonValue";

// eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style -- An interface supports recursive JSON values without a circular type alias.
export interface OpenId4VcJsonObject {
    [key: string]: OpenId4VcJsonValue;
}
