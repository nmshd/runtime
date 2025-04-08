import { ResponseItemResult } from "@nmshd/content";
import { LocalAttributeDVO, LocalAttributeListenerDVO } from "../consumption";
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
        | "ShareAttributeAcceptResponseItemDVO"
        | "FreeTextAcceptResponseItemDVO"
        | "FormFieldAcceptResponseItemDVO"
        | "RegisterAttributeListenerAcceptResponseItemDVO"
        | "TransferFileOwnershipAcceptResponseItemDVO"
        | "AttributeSuccessionAcceptResponseItemDVO"
        | "AttributeAlreadySharedAcceptResponseItemDVO";
    result: ResponseItemResult.Accepted;
}

export interface ReadAttributeAcceptResponseItemDVO extends AcceptResponseItemDVO {
    type: "ReadAttributeAcceptResponseItemDVO";
    attributeId: string;
    thirdPartyAddress?: string;
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

export interface ShareAttributeAcceptResponseItemDVO extends AcceptResponseItemDVO {
    type: "ShareAttributeAcceptResponseItemDVO";
    attributeId: string;
    attribute: LocalAttributeDVO;
}

export interface FreeTextAcceptResponseItemDVO extends AcceptResponseItemDVO {
    type: "FreeTextAcceptResponseItemDVO";
    freeText: string;
}

export interface FormFieldAcceptResponseItemDVO extends AcceptResponseItemDVO {
    type: "FormFieldAcceptResponseItemDVO";
    freeValue?: string;
    options?: string[];
}

export interface RegisterAttributeListenerAcceptResponseItemDVO extends AcceptResponseItemDVO {
    type: "RegisterAttributeListenerAcceptResponseItemDVO";
    listenerId: string;
    listener: LocalAttributeListenerDVO;
}

export interface TransferFileOwnershipAcceptResponseItemDVO extends AcceptResponseItemDVO {
    type: "TransferFileOwnershipAcceptResponseItemDVO";
    repositoryAttribute?: LocalAttributeDVO;
    sharedAttributeId: string;
    sharedAttribute: LocalAttributeDVO;
}

export interface AttributeSuccessionAcceptResponseItemDVO extends AcceptResponseItemDVO {
    type: "AttributeSuccessionAcceptResponseItemDVO";
    predecessorId: string;
    successorId: string;
    predecessor: LocalAttributeDVO;
    successor: LocalAttributeDVO;
}

export interface AttributeAlreadySharedAcceptResponseItemDVO extends AcceptResponseItemDVO {
    type: "AttributeAlreadySharedAcceptResponseItemDVO";
    attributeId: string;
    attribute: LocalAttributeDVO;
}
