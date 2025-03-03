import { RequestItemDVO } from "../content";
import { DraftIdentityAttributeDVO, DraftRelationshipAttributeDVO, IdentityAttributeQueryDVO, ThirdPartyRelationshipAttributeQueryDVO } from "../content/AttributeDVOs";
import { LocalAttributeDVO, ProcessedAttributeQueryDVO } from "./LocalAttributeDVO";

export interface DecidableRequestItemDVO extends RequestItemDVO {
    isDecidable: true;
}

export interface DecidableReadAttributeRequestItemDVO extends DecidableRequestItemDVO {
    type: "DecidableReadAttributeRequestItemDVO";
    query: ProcessedAttributeQueryDVO;
}

export interface DecidableProposeAttributeRequestItemDVO extends DecidableRequestItemDVO {
    type: "DecidableProposeAttributeRequestItemDVO";
    query: ProcessedAttributeQueryDVO;
    attribute: DraftIdentityAttributeDVO | DraftRelationshipAttributeDVO;
}

export interface DecidableCreateAttributeRequestItemDVO extends DecidableRequestItemDVO {
    type: "DecidableCreateAttributeRequestItemDVO";
    attribute: DraftIdentityAttributeDVO | DraftRelationshipAttributeDVO;
}

export interface DecidableDeleteAttributeRequestItemDVO extends DecidableRequestItemDVO {
    type: "DecidableDeleteAttributeRequestItemDVO";
    attributeId: string;
    attribute: LocalAttributeDVO;
}

export interface DecidableShareAttributeRequestItemDVO extends DecidableRequestItemDVO {
    type: "DecidableShareAttributeRequestItemDVO";
    sourceAttributeId: string;
    thirdPartyAddress?: string;
    attribute: DraftIdentityAttributeDVO;
}

export interface DecidableAuthenticationRequestItemDVO extends DecidableRequestItemDVO {
    type: "DecidableAuthenticationRequestItemDVO";
    title: string;
}

export interface DecidableConsentRequestItemDVO extends DecidableRequestItemDVO {
    type: "DecidableConsentRequestItemDVO";
    consent: string;
    link?: string;
}

export interface DecidableFreeTextRequestItemDVO extends DecidableRequestItemDVO {
    type: "DecidableFreeTextRequestItemDVO";
    freeText: string;
}

export interface DecidableRegisterAttributeListenerRequestItemDVO extends DecidableRequestItemDVO {
    type: "DecidableRegisterAttributeListenerRequestItemDVO";
    query: IdentityAttributeQueryDVO | ThirdPartyRelationshipAttributeQueryDVO;
}
