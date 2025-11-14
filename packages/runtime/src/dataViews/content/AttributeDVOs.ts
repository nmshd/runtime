import {
    IdentityAttributeJSON,
    IQLQuery,
    IQLQueryCreationHintsJSON,
    RelationshipAttributeCreationHintsJSON,
    RelationshipAttributeJSON,
    RenderHintsJSON,
    ValueHintsJSON
} from "@nmshd/content";
import { DataViewObject } from "../DataViewObject.js";
import { IdentityDVO } from "../transport/index.js";

export interface DraftIdentityAttributeDVO extends DataViewObject {
    type: "DraftIdentityAttributeDVO";
    content: IdentityAttributeJSON | RelationshipAttributeJSON;
    owner: IdentityDVO;
    renderHints: RenderHintsJSON;
    valueHints: ValueHintsJSON;
    valueType: string;
    isOwn: boolean;
    isDraft: true;
    succeeds?: string;
    succeededBy?: string;
    value: unknown;
    tags: string[];
}

export interface DraftRelationshipAttributeDVO extends DataViewObject {
    type: "DraftRelationshipAttributeDVO";
    content: IdentityAttributeJSON | RelationshipAttributeJSON;
    owner: IdentityDVO;
    renderHints: RenderHintsJSON;
    valueHints: ValueHintsJSON;
    valueType: string;
    isOwn: boolean;
    isDraft: true;
    succeeds?: string;
    succeededBy?: string;
    value: unknown;
    key: string;
    isTechnical: boolean;
    confidentiality: string;
}

export interface AttributeQueryDVO extends DataViewObject {}

export interface IdentityAttributeQueryDVO extends AttributeQueryDVO {
    type: "IdentityAttributeQueryDVO";
    valueType: string;
    tags?: string[];
    isProcessed: false;
    renderHints: RenderHintsJSON;
    valueHints: ValueHintsJSON;
}

export interface RelationshipAttributeQueryDVO extends AttributeQueryDVO {
    type: "RelationshipAttributeQueryDVO";
    valueType: string;
    key: string;
    owner: IdentityDVO;
    attributeCreationHints: RelationshipAttributeCreationHintsJSON;
    isProcessed: false;
    renderHints: RenderHintsJSON;
    valueHints: ValueHintsJSON;
}

export interface ThirdPartyRelationshipAttributeQueryDVO extends AttributeQueryDVO {
    type: "ThirdPartyRelationshipAttributeQueryDVO";
    key: string;
    owner: IdentityDVO;
    thirdParty: IdentityDVO[];
    isProcessed: false;
}

export interface IQLQueryDVO extends AttributeQueryDVO, Pick<IQLQuery, "queryString"> {
    type: "IQLQueryDVO";
    isProcessed: false;
    valueType?: string;
    attributeCreationHints?: IQLQueryCreationHintsJSON;
    renderHints?: RenderHintsJSON;
    valueHints?: ValueHintsJSON;
    tags?: string[];
}
