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
        | "ShareAttributeAcceptResponseItemDVO"
        | "RegisterAttributeListenerAcceptResponseItemDVO";
    result: ResponseItemResult.Accepted;
}

export interface ReadAttributeAcceptResponseItemDVO extends AcceptResponseItemDVO {
    type: "ReadAttributeAcceptResponseItemDVO";
    attributeId: string;
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

export interface ShareAttributeAcceptResponseItemDVO extends AcceptResponseItemDVO {
    type: "ShareAttributeAcceptResponseItemDVO";
    attributeId: string;
    attribute: LocalAttributeDVO;
}

export interface RegisterAttributeListenerAcceptResponseItemDVO extends AcceptResponseItemDVO {
    type: "RegisterAttributeListenerAcceptResponseItemDVO";
    listenerId: string;
    listener: LocalAttributeListenerDVO;
}
