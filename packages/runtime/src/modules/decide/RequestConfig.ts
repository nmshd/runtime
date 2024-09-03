import { IdentityAttribute, RelationshipAttribute, RelationshipAttributeConfidentiality } from "@nmshd/content";

// TODO: strings like in query or actual types?
export interface GeneralRequestConfig {
    peer?: string | string[];
    createdAt?: string | string[];
    "source.type"?: "Message" | "RelationshipTemplate"; // TODO: can we get onNewRelationship or onExistingRelationship for RelationshipTemplates? Yes, but we won't do it for now.
    "source.reference"?: string | string[]; // TODO: does this make sense? If we keep this, we should probably also provide the possible to configure the ID of the Request.
    "content.expiresAt"?: string | string[];
    "content.title"?: string | string[];
    "content.description"?: string | string[];
    "content.metadata"?: object | object[];
    // "content.metadata"?: string | string[]; // TODO: or an object?
}

export interface RequestItemConfig extends GeneralRequestConfig {
    "content.item.@type": string | string[];
    "content.item.mustBeAccepted"?: boolean; // TODO: or "true" | "false"?
    "content.item.title"?: string | string[];
    "content.item.description"?: string | string[];
    "content.item.metadata"?: string | string[];
}

export interface AuthenticationRequestItemConfig extends RequestItemConfig {
    "content.item.@type": "AuthenticationRequestItem";
}

export interface ConsentRequestItemConfig extends RequestItemConfig {
    "content.item.@type": "ConsentRequestItem";
    consent?: string | string[];
    link?: string | string[];
}

// TODO: does it make sense to have an abstract interface AttributeRequestConfig to avoid redundancy?
export interface CreateAttributeRequestItemConfig extends RequestItemConfig {
    "content.item.@type": "CreateAttributeRequestItem";
    "attribute.@type"?: IdentityAttribute | RelationshipAttribute;
    "attribute.owner"?: string | string[];
    "attribute.validFrom"?: string | string[];
    "attribute.validTo"?: string | string[];
    "attribute.tags"?: string[]; // TODO: check this
    "attribute.key"?: string | string[];
    "attribute.isTechnical"?: boolean; // TODO: or "true" | "false"?
    "attribute.confidentiality"?: RelationshipAttributeConfidentiality | RelationshipAttributeConfidentiality[];
    "attribute.value.@type"?: string | string[]; // TODO: should it be possible to specify the attribute value in more detail?
}

export interface DeleteAttributeRequestItemConfig extends RequestItemConfig {
    "content.item.@type": "DeleteAttributeRequestItem";
    attributeId?: string | string[];
}

export interface FreeTextRequestItemConfig extends RequestItemConfig {
    "content.item.@type": "FreeTextRequestItem";
    freeText?: string | string[];
}

// TODO: does it make sense to have an abstract interface QueryRequestConfig to avoid redundancy?
export interface ProposeAttributeRequestItemConfig extends RequestItemConfig {
    "content.item.@type": "ProposeAttributeRequestItem";
    "attribute.@type"?: IdentityAttribute | RelationshipAttribute;
    "attribute.owner"?: string | string[];
    "attribute.validFrom"?: string | string[];
    "attribute.validTo"?: string | string[];
    "attribute.tags"?: string[]; // TODO: check this
    "attribute.key"?: string | string[];
    "attribute.isTechnical"?: boolean; // TODO: or "true" | "false"?
    "attribute.confidentiality"?: RelationshipAttributeConfidentiality | RelationshipAttributeConfidentiality[];
    "attribute.value.@type"?: string | string[]; // TODO: should it be possible to specify the attribute value in more detail?
    "query.@type"?: "IdentityAttributeQuery" | "RelationshipAttributeQuery" | "ThirdPartyRelationshipAttributeQuery" | "IQLQuery";
    "query.validFrom"?: string | string[];
    "query.validTo"?: string | string[];
    "query.valueType"?: string | string[];
    "query.tags"?: string[]; // TODO: check this
    "query.key"?: string | string[];
    "query.owner"?: string | string[];
    "query.queryString"?: string | string[];
    "query.attributeCreationHints.title"?: string | string[];
    "query.attributeCreationHints.description"?: string | string[];
    "query.attributeCreationHints.valueType"?: string | string[];
    "query.attributeCreationHints.confidentiality"?: RelationshipAttributeConfidentiality | RelationshipAttributeConfidentiality[];
    "query.attributeCreationHints.valueHints.editHelp"?: string | string[];
    "query.attributeCreationHints.valueHints.min"?: number | number[];
    "query.attributeCreationHints.valueHints.max"?: number | number[];
    "query.attributeCreationHints.valueHints.pattern"?: string | string[];
    "query.attributeCreationHints.valueHints.defaultValue"?: string | string[] | number | number[] | boolean | boolean[]; // TODO: like this?
    "query.attributeCreationHints.valueHints.propertyHints"?: string | string[]; // TODO: or an object?
    "query.attributeCreationHints.valueHints.values.key"?: string | string[] | number | number[] | boolean | boolean[]; // TODO: like this?
    "query.attributeCreationHints.valueHints.values.displayName"?: string | string[];
    "query.attributeCreationHints.tags"?: string[]; // TODO: check this
}

export interface ReadAttributeRequestItemConfig extends RequestItemConfig {
    "content.item.@type": "ReadAttributeRequestItem";
    "query.@type"?: "IdentityAttributeQuery" | "RelationshipAttributeQuery" | "ThirdPartyRelationshipAttributeQuery" | "IQLQuery";
    "query.validFrom"?: string | string[];
    "query.validTo"?: string | string[];
    "query.valueType"?: string | string[];
    "query.tags"?: string[]; // TODO: check this
    "query.key"?: string | string[];
    "query.owner"?: string | string[];
    "query.thirdParty"?: string[];
    "query.queryString"?: string | string[];
    "query.attributeCreationHints.title"?: string | string[];
    "query.attributeCreationHints.description"?: string | string[];
    "query.attributeCreationHints.valueType"?: string | string[];
    "query.attributeCreationHints.confidentiality"?: RelationshipAttributeConfidentiality | RelationshipAttributeConfidentiality[];
    "query.attributeCreationHints.valueHints.editHelp"?: string | string[];
    "query.attributeCreationHints.valueHints.min"?: number | number[];
    "query.attributeCreationHints.valueHints.max"?: number | number[];
    "query.attributeCreationHints.valueHints.pattern"?: string | string[];
    "query.attributeCreationHints.valueHints.defaultValue"?: string | string[] | number | number[] | boolean | boolean[]; // TODO: like this?
    "query.attributeCreationHints.valueHints.propertyHints"?: string | string[]; // TODO: or an object?
    "query.attributeCreationHints.valueHints.values.key"?: string | string[] | number | number[] | boolean | boolean[]; // TODO: like this?
    "query.attributeCreationHints.valueHints.values.displayName"?: string | string[];
    "query.attributeCreationHints.tags"?: string[]; // TODO: check this
}

export interface ShareAttributeRequestItemConfig extends RequestItemConfig {
    "content.item.@type": "ShareAttributeRequestItem";
    // TODO: sourceAttributeId doesn't make sense, maybe for developement?
    "attribute.@type"?: IdentityAttribute | RelationshipAttribute;
    "attribute.owner"?: string | string[];
    "attribute.validFrom"?: string | string[];
    "attribute.validTo"?: string | string[];
    "attribute.tags"?: string[];
    "attribute.key"?: string | string[];
    "attribute.isTechnical"?: boolean; // TODO: or "true" | "false"?
    "attribute.confidentiality"?: RelationshipAttributeConfidentiality | RelationshipAttributeConfidentiality[];
    "attribute.value.@type"?: string | string[]; // TODO: should it be possible to specify the attribute value in more detail?
}

export type RequestItemDerivationConfig = RequestItemConfig | CreateAttributeRequestItemConfig | FreeTextRequestItemConfig | ShareAttributeRequestItemConfig;

// TODO: delete one of the following two?
export function isGeneralRequestConfig(input: any): input is GeneralRequestConfig {
    return !input["content.item.@type"];
}

export function isRequestItemDerivationConfig(input: any): input is RequestItemDerivationConfig {
    return !!input["content.item.@type"];
}

export type RequestConfig = GeneralRequestConfig | RequestItemDerivationConfig;
