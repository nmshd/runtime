import { serialize, type, validate } from "@js-soft/ts-serval";
import { IResponseItem, ResponseItem, ResponseItemJSON } from "./ResponseItem.js";
import { ResponseItemResult } from "./ResponseItemResult.js";

export interface RejectResponseItemJSON extends ResponseItemJSON {
    "@type": "RejectResponseItem";
    result: ResponseItemResult.Rejected;
    code?: string;
    message?: string;
}

export type RejectResponseItemJSONDerivations = RejectResponseItemJSON;

export interface IRejectResponseItem extends IResponseItem {
    result: ResponseItemResult.Rejected;
    code?: string;
    message?: string;
}

export type IRejectResponseItemDerivations = IRejectResponseItem;

@type("RejectResponseItem")
export class RejectResponseItem extends ResponseItem implements IRejectResponseItem {
    public override result: ResponseItemResult.Rejected;

    @serialize()
    @validate({ nullable: true, max: 200 })
    public code?: string;

    @serialize()
    @validate({ nullable: true, max: 1000 })
    public message?: string;

    public static from(value: IRejectResponseItem | Omit<RejectResponseItemJSON, "@type">): RejectResponseItem {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): RejectResponseItemJSON {
        return super.toJSON(verbose, serializeAsString) as RejectResponseItemJSON;
    }
}

export type RejectResponseItemDerivations = RejectResponseItem;
