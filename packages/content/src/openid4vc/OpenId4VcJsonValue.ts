import type { OpenId4VcJsonObject } from "./OpenId4VcJsonObject";

export type OpenId4VcJsonValue = string | number | boolean | null | OpenId4VcJsonObject | OpenId4VcJsonValue[];
