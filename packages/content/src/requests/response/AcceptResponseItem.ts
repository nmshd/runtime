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
    FreeTextAcceptResponseItem,
    FreeTextAcceptResponseItemJSON,
    IAttributeAlreadySharedAcceptResponseItem,
    IAttributeSuccessionAcceptResponseItem,
    ICreateAttributeAcceptResponseItem,
    IFormFieldAcceptResponseItem,
    IFreeTextAcceptResponseItem,
    IProposeAttributeAcceptResponseItem,
    IReadAttributeAcceptResponseItem,
    IRegisterAttributeListenerAcceptResponseItem,
    IShareAttributeAcceptResponseItem,
    ProposeAttributeAcceptResponseItem,
    ProposeAttributeAcceptResponseItemJSON,
    ReadAttributeAcceptResponseItem,
    ReadAttributeAcceptResponseItemJSON,
    RegisterAttributeListenerAcceptResponseItem,
    RegisterAttributeListenerAcceptResponseItemJSON,
    ShareAttributeAcceptResponseItem,
    ShareAttributeAcceptResponseItemJSON
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
    | FreeTextAcceptResponseItemJSON
    | FormFieldAcceptResponseItemJSON;

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
    | IFreeTextAcceptResponseItem
    | IFormFieldAcceptResponseItem;

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
    | FreeTextAcceptResponseItem
    | FormFieldAcceptResponseItem;
