import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreId, ICoreId } from "@nmshd/core-types";
import { ContentJSON } from "../../ContentJSON.js";
import { IResponseItemDerivations, ResponseItemDerivations, ResponseItemJSONDerivations } from "./ResponseItem.js";
import { IResponseItemGroup, ResponseItemGroup, ResponseItemGroupJSON } from "./ResponseItemGroup.js";

export enum ResponseResult {
    Accepted = "Accepted",
    Rejected = "Rejected"
}

export interface ResponseJSON extends ContentJSON {
    "@type": "Response";
    result: ResponseResult;
    requestId: string;
    items: (ResponseItemGroupJSON | ResponseItemJSONDerivations)[];
}

export interface IResponse extends ISerializable {
    result: ResponseResult;
    requestId: ICoreId;
    items: (IResponseItemGroup | IResponseItemDerivations)[];
}

@type("Response")
export class Response extends Serializable {
    @serialize()
    @validate()
    public result: ResponseResult;

    @serialize()
    @validate()
    public requestId: CoreId;

    @serialize()
    @validate({ customValidator: (v) => (v.length < 1 ? "may not be empty" : undefined) })
    public items: (ResponseItemGroup | ResponseItemDerivations)[];

    public static from(value: IResponse | Omit<ResponseJSON, "@type">): Response {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): ResponseJSON {
        return super.toJSON(verbose, serializeAsString) as ResponseJSON;
    }
}
