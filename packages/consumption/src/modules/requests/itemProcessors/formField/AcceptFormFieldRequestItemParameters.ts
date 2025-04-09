import { PrimitiveType, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { AcceptRequestItemParametersJSON } from "../../incoming/decide/AcceptRequestItemParameters";

export interface AcceptFormFieldRequestItemParametersJSON extends AcceptRequestItemParametersJSON {
    response: string | number | boolean | string[];
}

@type("AcceptFormFieldRequestItemParameters")
export class AcceptFormFieldRequestItemParameters extends Serializable {
    @serialize()
    @validate({ allowedTypes: [PrimitiveType.String, PrimitiveType.Number, PrimitiveType.Boolean, PrimitiveType.Array] })
    public response: string | number | boolean | string[];

    public static from(value: AcceptFormFieldRequestItemParametersJSON): AcceptFormFieldRequestItemParameters {
        return this.fromAny(value);
    }
}
