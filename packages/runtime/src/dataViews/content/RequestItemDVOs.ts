import { FormFieldSettingsJSONDerivations } from "@nmshd/content";
import { LocalAttributeDVO } from "../consumption/index.js";
import { DataViewObject } from "../DataViewObject.js";
import { FileDVO } from "../transport/index.js";
import { AttributeQueryDVO, DraftIdentityAttributeDVO, DraftRelationshipAttributeDVO } from "./AttributeDVOs.js";
import { ResponseItemDVO, ResponseItemGroupDVO } from "./ResponseItemDVOs.js";

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
}

export interface DeleteAttributeRequestItemDVO extends RequestItemDVO {
    type: "DeleteAttributeRequestItemDVO";
    attributeId: string;
    attribute: LocalAttributeDVO;
}

export interface ShareAttributeRequestItemDVO extends RequestItemDVO {
    type: "ShareAttributeRequestItemDVO";
    attributeId: string;
    initialAttributePeer?: string;
    attribute: DraftIdentityAttributeDVO;
}

export interface AuthenticationRequestItemDVO extends RequestItemDVO {
    type: "AuthenticationRequestItemDVO";
    title: string;
}

export interface ConsentRequestItemDVO extends RequestItemDVO {
    type: "ConsentRequestItemDVO";
    consent: string;
    link?: string;
    linkDisplayText?: string;
    requiresInteraction?: boolean;
}

export interface FormFieldRequestItemDVO extends RequestItemDVO {
    type: "FormFieldRequestItemDVO";
    title: string;
    settings: FormFieldSettingsJSONDerivations;
}

export interface TransferFileOwnershipRequestItemDVO extends RequestItemDVO {
    type: "TransferFileOwnershipRequestItemDVO";
    fileReference: string;
    file: FileDVO;
    ownershipToken: string;
}
