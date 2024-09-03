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
}

export interface RequestItemConfig extends GeneralRequestConfig {
    "content.item.@type": string | string[];
    "content.item.mustBeAccepted"?: boolean;
    "content.item.title"?: string | string[];
    "content.item.description"?: string | string[];
    "content.item.metadata"?: object | object[];
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
    "content.item.attribute.@type"?: IdentityAttribute | RelationshipAttribute;
    "content.item.attribute.owner"?: string | string[];
    "content.item.attribute.validFrom"?: string | string[];
    "content.item.attribute.validTo"?: string | string[];
    "content.item.attribute.tags"?: string[]; // TODO: check this
    "content.item.attribute.key"?: string | string[];
    "content.item.attribute.isTechnical"?: boolean;
    "content.item.attribute.confidentiality"?: RelationshipAttributeConfidentiality | RelationshipAttributeConfidentiality[];
    "content.item.attribute.value.@type"?: string | string[]; // TODO: should it be possible to specify the attribute value in more detail?
}

export interface DeleteAttributeRequestItemConfig extends RequestItemConfig {
    "content.item.@type": "DeleteAttributeRequestItem";
    "content.item.attributeId"?: string | string[];
}

export interface FreeTextRequestItemConfig extends RequestItemConfig {
    "content.item.@type": "FreeTextRequestItem";
    "content.item.freeText"?: string | string[];
}

// TODO: does it make sense to have an abstract interface QueryRequestConfig to avoid redundancy?
export interface ProposeAttributeRequestItemConfig extends RequestItemConfig {
    "content.item.@type": "ProposeAttributeRequestItem";
    "content.item.attribute.@type"?: IdentityAttribute | RelationshipAttribute;
    "content.item.attribute.owner"?: string | string[];
    "content.item.attribute.validFrom"?: string | string[];
    "content.item.attribute.validTo"?: string | string[];
    "content.item.attribute.tags"?: string[]; // TODO: check this
    "content.item.attribute.key"?: string | string[];
    "content.item.attribute.isTechnical"?: boolean; // TODO: or "true" | "false"?
    "content.item.attribute.confidentiality"?: RelationshipAttributeConfidentiality | RelationshipAttributeConfidentiality[];
    "content.item.attribute.value.@type"?: string | string[]; // TODO: should it be possible to specify the attribute value in more detail?
    "content.item.query.@type"?: "IdentityAttributeQuery" | "RelationshipAttributeQuery" | "ThirdPartyRelationshipAttributeQuery" | "IQLQuery";
    "content.item.query.validFrom"?: string | string[];
    "content.item.query.validTo"?: string | string[];
    "content.item.query.valueType"?: string | string[];
    "content.item.query.tags"?: string[]; // TODO: check this
    "content.item.query.key"?: string | string[];
    "content.item.query.owner"?: string | string[];
    "content.item.query.queryString"?: string | string[];
    "content.item.query.attributeCreationHints.title"?: string | string[];
    "content.item.query.attributeCreationHints.description"?: string | string[];
    "content.item.query.attributeCreationHints.valueType"?: string | string[];
    "content.item.query.attributeCreationHints.confidentiality"?: RelationshipAttributeConfidentiality | RelationshipAttributeConfidentiality[];
    "content.item.query.attributeCreationHints.valueHints.editHelp"?: string | string[];
    "content.item.query.attributeCreationHints.valueHints.min"?: number | number[];
    "content.item.query.attributeCreationHints.valueHints.max"?: number | number[];
    "content.item.query.attributeCreationHints.valueHints.pattern"?: string | string[];
    "content.item.query.attributeCreationHints.valueHints.defaultValue"?: string | string[] | number | number[] | boolean | boolean[]; // TODO: like this?
    "content.item.query.attributeCreationHints.valueHints.propertyHints"?: string | string[]; // TODO: or an object?
    "content.item.query.attributeCreationHints.valueHints.values.key"?: string | string[] | number | number[] | boolean | boolean[]; // TODO: like this?
    "content.item.query.attributeCreationHints.valueHints.values.displayName"?: string | string[];
    "content.item.query.attributeCreationHints.tags"?: string[]; // TODO: check this
}

export interface ReadAttributeRequestItemConfig extends RequestItemConfig {
    "content.item.@type": "ReadAttributeRequestItem";
    "content.item.query.@type"?: "IdentityAttributeQuery" | "RelationshipAttributeQuery" | "ThirdPartyRelationshipAttributeQuery" | "IQLQuery";
    "content.item.query.validFrom"?: string | string[];
    "content.item.query.validTo"?: string | string[];
    "content.item.query.valueType"?: string | string[];
    "content.item.query.tags"?: string[]; // TODO: check this
    "content.item.query.key"?: string | string[];
    "content.item.query.owner"?: string | string[];
    "content.item.query.thirdParty"?: string[];
    "content.item.query.queryString"?: string | string[];
    "content.item.query.attributeCreationHints.title"?: string | string[];
    "content.item.query.attributeCreationHints.description"?: string | string[];
    "content.item.query.attributeCreationHints.valueType"?: string | string[];
    "content.item.query.attributeCreationHints.confidentiality"?: RelationshipAttributeConfidentiality | RelationshipAttributeConfidentiality[];
    "content.item.query.attributeCreationHints.valueHints.editHelp"?: string | string[];
    "content.item.query.attributeCreationHints.valueHints.min"?: number | number[];
    "content.item.query.attributeCreationHints.valueHints.max"?: number | number[];
    "content.item.query.attributeCreationHints.valueHints.pattern"?: string | string[];
    "content.item.query.attributeCreationHints.valueHints.defaultValue"?: string | string[] | number | number[] | boolean | boolean[]; // TODO: like this?
    "content.item.query.attributeCreationHints.valueHints.propertyHints"?: string | string[]; // TODO: or an object?
    "content.item.query.attributeCreationHints.valueHints.values.key"?: string | string[] | number | number[] | boolean | boolean[]; // TODO: like this?
    "content.item.query.attributeCreationHints.valueHints.values.displayName"?: string | string[];
    "content.item.query.attributeCreationHints.tags"?: string[]; // TODO: check this
}

export interface ShareAttributeRequestItemConfig extends RequestItemConfig {
    "content.item.@type": "ShareAttributeRequestItem";
    // TODO: sourceAttributeId doesn't make sense, maybe for developement?
    "content.item.attribute.@type"?: IdentityAttribute | RelationshipAttribute;
    "content.item.attribute.owner"?: string | string[];
    "content.item.attribute.validFrom"?: string | string[];
    "content.item.attribute.validTo"?: string | string[];
    "content.item.attribute.tags"?: string[];
    "content.item.attribute.key"?: string | string[];
    "content.item.attribute.isTechnical"?: boolean;
    "content.item.attribute.confidentiality"?: RelationshipAttributeConfidentiality | RelationshipAttributeConfidentiality[];
    "content.item.attribute.value.@type"?: string | string[]; // TODO: should it be possible to specify the attribute value in more detail?
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
