/**
 * @pattern did:e:((([A-Za-z0-9]+(-[A-Za-z0-9]+)*)\.)+[a-z]{2,}|localhost):dids:[0-9a-f]{22}
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
 * @pattern NOT[A-Za-z0-9]{17}
 */
export type NotificationIdString = string;

/**
 * @pattern IDP[A-Za-z0-9]{17}
 */
export type IdentityDeletionProcessIdString = string;

/**
 * @pattern VE9L.{84}
 */
export type TokenReferenceString = string;

/**
 * @pattern ^https?:\/\/.*\/r\/TOK[a-zA-Z0-9]+(\?app=.+)?#[a-zA-Z0-9-_]+$
 */
export type URLTokenReferenceString = string;

/**
 * @pattern RklM.{84}
 */
export type FileReferenceString = string;

/**
 * @pattern ^https?:\/\/.*\/r\/FIL[a-zA-Z0-9]+(\?app=.+)?#[a-zA-Z0-9-_]+$
 */
export type URLFileReferenceString = string;

/**
 * @pattern UkxU.{84}
 */
export type RelationshipTemplateReferenceString = string;

/**
 * @pattern ^https?:\/\/.*\/r\/RLT[a-zA-Z0-9]+(\?app=.+)?#[a-zA-Z0-9-_]+$
 */
export type URLRelationshipTemplateReferenceString = string;

// the pattern is an ISO 8601 date string regex from https://stackoverflow.com/a/14322189/10029378
/**
 * @errorMessage must match ISO8601 datetime format
 * @pattern ^([+-]?\d{4}(?!\d{2}\b))((-?)((0[1-9]|1[0-2])(\3([12]\d|0[1-9]|3[01]))?|W([0-4]\d|5[0-2])(-?[1-7])?|(00[1-9]|0[1-9]\d|[12]\d{2}|3([0-5]\d|6[1-6])))([T\s]((([01]\d|2[0-3])((:?)[0-5]\d)?|24:?00)([.,]\d+(?!:))?)?(\17[0-5]\d([.,]\d+)?)?([zZ]|([+-])([01]\d|2[0-3]):?([0-5]\d)?)?)?)?$
 */
export type ISO8601DateTimeString = string;
