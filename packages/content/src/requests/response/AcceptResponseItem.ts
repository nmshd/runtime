import { type } from "@js-soft/ts-serval";
import {
    AttributeAlreadySharedAcceptResponseItem,
    AttributeAlreadySharedAcceptResponseItemJSON,
    AttributeSuccessionAcceptResponseItem,
    AttributeSuccessionAcceptResponseItemJSON,
    CreateAttributeAcceptResponseItem,
    CreateAttributeAcceptResponseItemJSON,
    FormFieldAcceptResponseItem,
    FormFieldAcceptResponseItemJSON,
    IAttributeAlreadySharedAcceptResponseItem,
    IAttributeSuccessionAcceptResponseItem,
    ICreateAttributeAcceptResponseItem,
    IFormFieldAcceptResponseItem,
    IProposeAttributeAcceptResponseItem,
    IReadAttributeAcceptResponseItem,
    IRegisterAttributeListenerAcceptResponseItem,
    IShareAttributeAcceptResponseItem,
    ITransferFileOwnershipAcceptResponseItem,
    ProposeAttributeAcceptResponseItem,
    ProposeAttributeAcceptResponseItemJSON,
    ReadAttributeAcceptResponseItem,
    ReadAttributeAcceptResponseItemJSON,
    RegisterAttributeListenerAcceptResponseItem,
    RegisterAttributeListenerAcceptResponseItemJSON,
    ShareAttributeAcceptResponseItem,
    ShareAttributeAcceptResponseItemJSON,
    TransferFileOwnershipAcceptResponseItem,
    TransferFileOwnershipAcceptResponseItemJSON
} from "../items";
import { IResponseItem, ResponseItem, ResponseItemJSON } from "./ResponseItem";
import { ResponseItemResult } from "./ResponseItemResult";

export interface AcceptResponseItemJSON extends ResponseItemJSON {
    result: ResponseItemResult.Accepted;
}

export type AcceptResponseItemJSONDerivations =
    | AcceptResponseItemJSON
    | AttributeAlreadySharedAcceptResponseItemJSON
    | AttributeSuccessionAcceptResponseItemJSON
    | CreateAttributeAcceptResponseItemJSON
    | ShareAttributeAcceptResponseItemJSON
    | ProposeAttributeAcceptResponseItemJSON
    | ReadAttributeAcceptResponseItemJSON
    | RegisterAttributeListenerAcceptResponseItemJSON
    | FormFieldAcceptResponseItemJSON
    | TransferFileOwnershipAcceptResponseItemJSON;

export interface IAcceptResponseItem extends IResponseItem {
    result: ResponseItemResult.Accepted;
}

export type IAcceptResponseItemDerivations =
    | IAcceptResponseItem
    | IAttributeAlreadySharedAcceptResponseItem
    | IAttributeSuccessionAcceptResponseItem
    | ICreateAttributeAcceptResponseItem
    | IShareAttributeAcceptResponseItem
    | IProposeAttributeAcceptResponseItem
    | IReadAttributeAcceptResponseItem
    | IRegisterAttributeListenerAcceptResponseItem
    | IFormFieldAcceptResponseItem
    | ITransferFileOwnershipAcceptResponseItem;

@type("AcceptResponseItem")
export class AcceptResponseItem extends ResponseItem implements IAcceptResponseItem {
    public override result: ResponseItemResult.Accepted;

    public static from(value: IAcceptResponseItem | Omit<AcceptResponseItemJSON, "@type">): AcceptResponseItem {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): AcceptResponseItemJSON {
        return super.toJSON(verbose, serializeAsString) as AcceptResponseItemJSON;
    }
}

export type AcceptResponseItemDerivations =
    | AcceptResponseItem
    | AttributeAlreadySharedAcceptResponseItem
    | AttributeSuccessionAcceptResponseItem
    | CreateAttributeAcceptResponseItem
    | ShareAttributeAcceptResponseItem
    | ProposeAttributeAcceptResponseItem
    | ReadAttributeAcceptResponseItem
    | RegisterAttributeListenerAcceptResponseItem
    | FormFieldAcceptResponseItem
    | TransferFileOwnershipAcceptResponseItem;
