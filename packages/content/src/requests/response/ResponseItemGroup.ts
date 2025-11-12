import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { ContentJSON } from "../../ContentJSON.js";
import { IResponseItemDerivations, ResponseItemDerivations, ResponseItemJSONDerivations } from "./ResponseItem.js";

export interface ResponseItemGroupJSON extends ContentJSON {
    "@type": "ResponseItemGroup";
    items: ResponseItemJSONDerivations[];
}

export interface IResponseItemGroup extends ISerializable {
    items: IResponseItemDerivations[];
}

@type("ResponseItemGroup")
export class ResponseItemGroup extends Serializable {
    @serialize()
    @validate({ customValidator: (v) => (v.length < 1 ? "may not be empty" : undefined) })
    public items: ResponseItemDerivations[];

    public static from(value: IResponseItemGroup | Omit<ResponseItemGroupJSON, "@type">): ResponseItemGroup {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): ResponseItemGroupJSON {
        return super.toJSON(verbose, serializeAsString) as ResponseItemGroupJSON;
    }
}
