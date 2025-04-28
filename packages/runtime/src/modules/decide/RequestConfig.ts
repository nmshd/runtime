import { RelationshipAttributeConfidentiality } from "@nmshd/content";

export interface GeneralRequestConfig {
    peer?: string | string[];
    createdAt?: string | string[];
    "source.type"?: "Message" | "RelationshipTemplate";
    "content.expiresAt"?: string | string[];
    "content.title"?: string | string[];
    "content.description"?: string | string[];
    "content.metadata"?: object | object[];
}

export interface RelationshipRequestConfig extends GeneralRequestConfig {
    relationshipAlreadyExists?: boolean;
}

export interface RequestItemConfig extends GeneralRequestConfig {
    "content.item.@type"?: string | string[];
    "content.item.mustBeAccepted"?: boolean;
    "content.item.description"?: string | string[];
    "content.item.metadata"?: object | object[];
}

export interface AuthenticationRequestItemConfig extends RequestItemConfig {
    "content.item.@type": "AuthenticationRequestItem";
    "content.item.title"?: string | string[];
}

export interface ConsentRequestItemConfig extends RequestItemConfig {
    "content.item.@type": "ConsentRequestItem";
    "content.item.consent"?: string | string[];
    "content.item.link"?: string | string[];
}

export interface CreateAttributeRequestItemConfig extends RequestItemConfig {
    "content.item.@type": "CreateAttributeRequestItem";
    "content.item.attribute.@type"?: "IdentityAttribute" | "RelationshipAttribute";
    "content.item.attribute.owner"?: string | string[];
    "content.item.attribute.tags"?: string[];
    "content.item.attribute.key"?: string | string[];
    "content.item.attribute.isTechnical"?: boolean;
    "content.item.attribute.confidentiality"?: RelationshipAttributeConfidentiality | RelationshipAttributeConfidentiality[];
    "content.item.attribute.value.@type"?: string | string[];
    "content.item.attribute.value.value"?: string | string[];
    "content.item.attribute.value.title"?: string | string[];
    "content.item.attribute.value.description"?: string | string[];
}

export interface DeleteAttributeRequestItemConfig extends RequestItemConfig {
    "content.item.@type": "DeleteAttributeRequestItem";
}

export interface ProposeAttributeRequestItemConfig extends RequestItemConfig {
    "content.item.@type": "ProposeAttributeRequestItem";
    "content.item.attribute.@type"?: "IdentityAttribute" | "RelationshipAttribute";
    "content.item.attribute.tags"?: string[];
    "content.item.attribute.key"?: string | string[];
    "content.item.attribute.isTechnical"?: boolean;
    "content.item.attribute.confidentiality"?: RelationshipAttributeConfidentiality | RelationshipAttributeConfidentiality[];
    "content.item.attribute.value.@type"?: string | string[];
    "content.item.attribute.value.value"?: string | string[];
    "content.item.attribute.value.title"?: string | string[];
    "content.item.attribute.value.description"?: string | string[];
    "content.item.query.@type"?: "IdentityAttributeQuery" | "RelationshipAttributeQuery" | "IQLQuery";
    "content.item.query.valueType"?: string | string[];
    "content.item.query.tags"?: string[];
    "content.item.query.key"?: string | string[];
    "content.item.query.queryString"?: string | string[];
    "content.item.query.attributeCreationHints.title"?: string | string[];
    "content.item.query.attributeCreationHints.description"?: string | string[];
    "content.item.query.attributeCreationHints.valueType"?: string | string[];
    "content.item.query.attributeCreationHints.confidentiality"?: RelationshipAttributeConfidentiality | RelationshipAttributeConfidentiality[];
    "content.item.query.attributeCreationHints.tags"?: string[];
}

export interface ReadAttributeRequestItemConfig extends RequestItemConfig {
    "content.item.@type": "ReadAttributeRequestItem";
    "content.item.query.@type"?: "IdentityAttributeQuery" | "RelationshipAttributeQuery" | "IQLQuery";
    "content.item.query.valueType"?: string | string[];
    "content.item.query.tags"?: string[];
    "content.item.query.key"?: string | string[];
    "content.item.query.owner"?: string | string[];
    "content.item.query.queryString"?: string | string[];
    "content.item.query.attributeCreationHints.title"?: string | string[];
    "content.item.query.attributeCreationHints.description"?: string | string[];
    "content.item.query.attributeCreationHints.valueType"?: string | string[];
    "content.item.query.attributeCreationHints.confidentiality"?: RelationshipAttributeConfidentiality | RelationshipAttributeConfidentiality[];
    "content.item.query.attributeCreationHints.tags"?: string[];
}

export interface RegisterAttributeListenerRequestItemConfig extends RequestItemConfig {
    "content.item.@type": "RegisterAttributeListenerRequestItem";
    "content.item.query.@type"?: "IdentityAttributeQuery";
    "content.item.query.valueType"?: string | string[];
    "content.item.query.tags"?: string[];
}

export interface ShareAttributeRequestItemConfig extends RequestItemConfig {
    "content.item.@type": "ShareAttributeRequestItem";
    "content.item.attribute.@type"?: "IdentityAttribute" | "RelationshipAttribute";
    "content.item.attribute.owner"?: string | string[];
    "content.item.attribute.tags"?: string[];
    "content.item.attribute.key"?: string | string[];
    "content.item.attribute.isTechnical"?: boolean;
    "content.item.attribute.confidentiality"?: RelationshipAttributeConfidentiality | RelationshipAttributeConfidentiality[];
    "content.item.attribute.value.@type"?: string | string[];
    "content.item.attribute.value.value"?: string | string[];
    "content.item.attribute.value.title"?: string | string[];
    "content.item.attribute.value.description"?: string | string[];
}

export interface TransferFileOwnershipRequestItemConfig extends RequestItemConfig {
    "content.item.@type": "TransferFileOwnershipRequestItem";
}

export type RequestItemDerivationConfig =
    | RequestItemConfig
    | AuthenticationRequestItemConfig
    | ConsentRequestItemConfig
    | CreateAttributeRequestItemConfig
    | DeleteAttributeRequestItemConfig
    | ProposeAttributeRequestItemConfig
    | ReadAttributeRequestItemConfig
    | RegisterAttributeListenerRequestItemConfig
    | ShareAttributeRequestItemConfig
    | TransferFileOwnershipRequestItemConfig;

export function isGeneralRequestConfig(input: any): input is GeneralRequestConfig {
    return !Object.keys(input).some((key) => key.startsWith("content.item."));
}

export function isRequestItemDerivationConfig(input: any): input is RequestItemDerivationConfig {
    return Object.keys(input).some((key) => key.startsWith("content.item."));
}

export type RequestConfig = GeneralRequestConfig | RelationshipRequestConfig | RequestItemDerivationConfig;
