import { ResponseItemResult } from "@nmshd/content";
import { LocalAttributeDVO, OwnIdentityAttributeDVO } from "../consumption";
import { DataViewObject } from "../DataViewObject";

export interface ResponseItemGroupDVO {
    type: "ResponseItemGroupDVO";
    items: ResponseItemDVO[];
}

export interface ResponseItemDVO extends DataViewObject {
    result: ResponseItemResult;
}

export interface RejectResponseItemDVO extends ResponseItemDVO {
    type: "RejectResponseItemDVO";
    result: ResponseItemResult.Rejected;
    code?: string;
    message?: string;
}

export interface ErrorResponseItemDVO extends ResponseItemDVO {
    type: "ErrorResponseItemDVO";
    result: ResponseItemResult.Failed;
    code: string;
    message: string;
}

export interface AcceptResponseItemDVO extends ResponseItemDVO {
    type:
        | "AcceptResponseItemDVO"
        | "ReadAttributeAcceptResponseItemDVO"
        | "ProposeAttributeAcceptResponseItemDVO"
        | "CreateAttributeAcceptResponseItemDVO"
        | "DeleteAttributeAcceptResponseItemDVO"
        | "FormFieldAcceptResponseItemDVO"
        | "TransferFileOwnershipAcceptResponseItemDVO"
        | "AttributeSuccessionAcceptResponseItemDVO"
        | "AttributeAlreadySharedAcceptResponseItemDVO"
        | "AttributeAlreadyDeletedAcceptResponseItemDVO";
    result: ResponseItemResult.Accepted;
}

export interface ReadAttributeAcceptResponseItemDVO extends AcceptResponseItemDVO {
    type: "ReadAttributeAcceptResponseItemDVO";
    attributeId: string;
    initialAttributePeer?: string;
    attribute: LocalAttributeDVO;
}

export interface ProposeAttributeAcceptResponseItemDVO extends AcceptResponseItemDVO {
    type: "ProposeAttributeAcceptResponseItemDVO";
    attributeId: string;
    attribute: LocalAttributeDVO;
}

export interface CreateAttributeAcceptResponseItemDVO extends AcceptResponseItemDVO {
    type: "CreateAttributeAcceptResponseItemDVO";
    attributeId: string;
    attribute: LocalAttributeDVO;
}

export interface DeleteAttributeAcceptResponseItemDVO extends AcceptResponseItemDVO {
    type: "DeleteAttributeAcceptResponseItemDVO";
    deletionDate: string;
}

export interface FormFieldAcceptResponseItemDVO extends AcceptResponseItemDVO {
    type: "FormFieldAcceptResponseItemDVO";
    response: string | number | boolean | string[];
}

export interface TransferFileOwnershipAcceptResponseItemDVO extends AcceptResponseItemDVO {
    type: "TransferFileOwnershipAcceptResponseItemDVO";
    attributeId: string;
    attribute: OwnIdentityAttributeDVO;
}

export interface AttributeSuccessionAcceptResponseItemDVO extends AcceptResponseItemDVO {
    type: "AttributeSuccessionAcceptResponseItemDVO";
    predecessorId: string;
    successorId: string;
    predecessor?: LocalAttributeDVO;
    successor: LocalAttributeDVO;
}

export interface AttributeAlreadySharedAcceptResponseItemDVO extends AcceptResponseItemDVO {
    type: "AttributeAlreadySharedAcceptResponseItemDVO";
    attributeId: string;
    attribute: LocalAttributeDVO;
}

export interface AttributeAlreadyDeletedAcceptResponseItemDVO extends AcceptResponseItemDVO {
    type: "AttributeAlreadyDeletedAcceptResponseItemDVO";
}
