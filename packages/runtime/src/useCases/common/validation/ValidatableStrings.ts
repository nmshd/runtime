/**
 * @pattern id1[A-Za-z0-9]{32,33}
 */
export type AddressString = string;

/**
 * @pattern [A-Za-z0-9]{20}
 */
export type GenericIdString = string;

/**
 * @pattern TOK[A-Za-z0-9]{17}
 */
export type TokenIdString = string;

/**
 * @pattern ATT[A-Za-z0-9]{17}
 */
export type AttributeIdString = string;

/**
 * @pattern REQ[A-Za-z0-9]{17}
 */
export type RequestIdString = string;

/**
 * @pattern LCLDRF[A-Za-z0-9]{14}
 */
export type LocalDraftIdString = string;

/**
 * @pattern LCLSET[A-Za-z0-9]{14}
 */
export type LocalSettingIdString = string;

/**
 * @pattern RCH[A-Za-z0-9]{17}
 */
export type RelationshipChangeIdString = string;

/**
 * @pattern MSG[A-Za-z0-9]{17}
 */
export type MessageIdString = string;

/**
 * @pattern RLT[A-Za-z0-9]{17}
 */
export type RelationshipTemplateIdString = string;

/**
 * @pattern REL[A-Za-z0-9]{17}
 */
export type RelationshipIdString = string;

/**
 * @pattern DVC[A-Za-z0-9]{17}
 */
export type DeviceIdString = string;

/**
 * @pattern FIL[A-Za-z0-9]{17}
 */
export type FileIdString = string;

/**
 * @pattern ATL[A-Za-z0-9]{17}
 */
export type AttributeListenerIdString = string;

/**
 * @pattern NOT[A-Za-z0-9]{17}
 */
export type NotificationIdString = string;

/**
 * @pattern VE9L.{84}
 */
export type TokenReferenceString = string;

/**
 * @pattern RklM.{84}
 */
export type FileReferenceString = string;

/**
 * @pattern UkxU.{84}
 */
export type RelationshipTemplateReferenceString = string;

// the pattern is an ISO 8601 date string regex from https://stackoverflow.com/a/14322189/10029378
/**
 * @errorMessage must match ISO8601 datetime format
 * @pattern ^([+-]?\d{4}(?!\d{2}\b))((-?)((0[1-9]|1[0-2])(\3([12]\d|0[1-9]|3[01]))?|W([0-4]\d|5[0-2])(-?[1-7])?|(00[1-9]|0[1-9]\d|[12]\d{2}|3([0-5]\d|6[1-6])))([T\s]((([01]\d|2[0-3])((:?)[0-5]\d)?|24:?00)([.,]\d+(?!:))?)?(\17[0-5]\d([.,]\d+)?)?([zZ]|([+-])([01]\d|2[0-3]):?([0-5]\d)?)?)?)?$
 */
export type ISO8601DateTimeString = string;
