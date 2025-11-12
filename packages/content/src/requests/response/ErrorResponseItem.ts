import { serialize, type, validate } from "@js-soft/ts-serval";
import { IResponseItem, ResponseItem, ResponseItemJSON } from "./ResponseItem.js";
import { ResponseItemResult } from "./ResponseItemResult.js";

export interface ErrorResponseItemJSON extends ResponseItemJSON {
    "@type": "ErrorResponseItem";
    result: ResponseItemResult.Failed;
    code: string;
    message: string;
}

export type ErrorResponseItemJSONDerivations = ErrorResponseItemJSON;

export interface IErrorResponseItem extends IResponseItem {
    result: ResponseItemResult.Failed;
    code: string;
    message: string;
}

export type IErrorResponseItemDerivations = IErrorResponseItem;

@type("ErrorResponseItem")
export class ErrorResponseItem extends ResponseItem implements IErrorResponseItem {
    public override result: ResponseItemResult.Failed;

    @serialize()
    @validate({ max: 200 })
    public code: string;

    @serialize()
    @validate({ max: 1000 })
    public message: string;

    public static from(value: IErrorResponseItem | Omit<ErrorResponseItemJSON, "@type">): ErrorResponseItem {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): ErrorResponseItemJSON {
        return super.toJSON(verbose, serializeAsString) as ErrorResponseItemJSON;
    }
}

export type ErrorResponseItemDerivations = ErrorResponseItem;
