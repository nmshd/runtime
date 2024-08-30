import { IdentityAttribute, RelationshipAttribute, RelationshipAttributeConfidentiality } from "@nmshd/content";

// TODO: strings like in query or actual types?
export interface GeneralRequestConfig {
    peer?: string | string[];
    createdAt?: string | string[];
    source?: string; // TODO: can we get onNewRelationship or onExistingRelationship for RelationshipTemplates?
    "content.expiresAt"?: string | string[];
    "content.title"?: string | string[];
    "content.description"?: string | string[];
    "content.metadata"?: string | string[];
}

export interface RequestItemConfig extends GeneralRequestConfig {
    "content.item.@type": string | string[];
    "content.item.mustBeAccepted"?: string;
    "content.item.title"?: string | string[];
    "content.item.description"?: string | string[];
    "content.item.metadata"?: string | string[];
}

// TODO: does it make sense to have an abstract interface AttributeRequestConfig to avoid redundancy?
export interface CreateAttributeRequestItemConfig extends RequestItemConfig {
    "content.item.@type": "CreateAttributeRequestItem";
    "attribute.@type"?: IdentityAttribute | RelationshipAttribute;
    "attribute.owner"?: string;
    "attribute.validFrom"?: string;
    "attribute.validTo"?: string;
    "attribute.tags"?: string[];
    "attribute.key"?: string;
    "attribute.isTechnical"?: boolean;
    "attribute.confidentiality"?: RelationshipAttributeConfidentiality;
    "attribute.value.@type"?: string; // TODO: should it be possible to specify the attribute value in more detail?
}

export interface FreeTextRequestItemConfig extends RequestItemConfig {
    "content.item.@type": "FreeTextRequestItem";
    freeText?: string;
}

export interface ShareAttributeRequestItemConfig extends RequestItemConfig {
    "content.item.@type": "ShareAttributeRequestItem";
    // TODO: sourceAttributeId doesn't make sense, maybe for developement?
    "attribute.@type"?: IdentityAttribute | RelationshipAttribute;
    "attribute.owner"?: string;
    "attribute.validFrom"?: string;
    "attribute.validTo"?: string;
    "attribute.tags"?: string[];
    "attribute.key"?: string;
    "attribute.isTechnical"?: boolean;
    "attribute.confidentiality"?: RelationshipAttributeConfidentiality;
    "attribute.value.@type"?: string; // TODO: should it be possible to specify the attribute value in more detail?
}

export type RequestItemDerivationConfig = RequestItemConfig | CreateAttributeRequestItemConfig | FreeTextRequestItemConfig | ShareAttributeRequestItemConfig;

export function isRequestItemDerivationConfig(input: any): input is RequestItemDerivationConfig {
    return !!input["content.item.@type"];
}

export type RequestConfig = GeneralRequestConfig | RequestItemDerivationConfig;
