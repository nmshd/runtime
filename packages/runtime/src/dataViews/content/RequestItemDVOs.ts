import { FreeValueFieldTypes, SelectionFieldTypes } from "@nmshd/content";
import { LocalAttributeDVO } from "../consumption";
import { DataViewObject } from "../DataViewObject";
import { FileDVO } from "../transport";
import { AttributeQueryDVO, DraftIdentityAttributeDVO, DraftRelationshipAttributeDVO, IdentityAttributeQueryDVO, ThirdPartyRelationshipAttributeQueryDVO } from "./AttributeDVOs";
import { ResponseItemDVO, ResponseItemGroupDVO } from "./ResponseItemDVOs";

export interface RequestItemGroupDVO {
    type: "RequestItemGroupDVO";
    items: RequestItemDVO[];
    title?: string;
    description?: string;
    isDecidable: boolean;
    response?: ResponseItemGroupDVO;
}

export interface RequestItemDVO extends DataViewObject {
    mustBeAccepted: boolean;
    requireManualDecision?: boolean;
    isDecidable: boolean;
    response?: ResponseItemDVO;
}

export interface ReadAttributeRequestItemDVO extends RequestItemDVO {
    type: "ReadAttributeRequestItemDVO";
    query: AttributeQueryDVO;
}

export interface ProposeAttributeRequestItemDVO extends RequestItemDVO {
    type: "ProposeAttributeRequestItemDVO";
    query: AttributeQueryDVO;
    attribute: DraftIdentityAttributeDVO | DraftRelationshipAttributeDVO;
    proposedValueOverruled: boolean;
}

export interface CreateAttributeRequestItemDVO extends RequestItemDVO {
    type: "CreateAttributeRequestItemDVO";
    attribute: DraftIdentityAttributeDVO | DraftRelationshipAttributeDVO;
    sourceAttributeId?: string;
}

export interface DeleteAttributeRequestItemDVO extends RequestItemDVO {
    type: "DeleteAttributeRequestItemDVO";
    attributeId: string;
    attribute: LocalAttributeDVO;
}

export interface ShareAttributeRequestItemDVO extends RequestItemDVO {
    type: "ShareAttributeRequestItemDVO";
    sourceAttributeId: string;
    thirdPartyAddress?: string;
    attribute: DraftIdentityAttributeDVO;
}

export interface AuthenticationRequestItemDVO extends RequestItemDVO {
    type: "AuthenticationRequestItemDVO";
}

export interface ConsentRequestItemDVO extends RequestItemDVO {
    type: "ConsentRequestItemDVO";
    consent: string;
    link?: string;
}

export interface RegisterAttributeListenerRequestItemDVO extends RequestItemDVO {
    type: "RegisterAttributeListenerRequestItemDVO";
    query: IdentityAttributeQueryDVO | ThirdPartyRelationshipAttributeQueryDVO;
}

export interface FreeTextRequestItemDVO extends RequestItemDVO {
    type: "FreeTextRequestItemDVO";
    freeText: string;
}

export interface FreeValueFormRequestItemDVO extends RequestItemDVO {
    type: "FreeValueFormRequestItemDVO";
    freeValueFieldType: FreeValueFieldTypes;
}

export interface SelectionFormRequestItemDVO extends RequestItemDVO {
    type: "SelectionFormRequestItemDVO";
    selectionFieldType: SelectionFieldTypes;
    options: string[];
}

export interface TransferFileOwnershipRequestItemDVO extends RequestItemDVO {
    type: "TransferFileOwnershipRequestItemDVO";
    fileReference: string;
    file: FileDVO;
}
