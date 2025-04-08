import { Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { AcceptRequestItemParametersJSON } from "../../incoming/decide/AcceptRequestItemParameters";

export interface AcceptFormFieldRequestItemParametersJSON extends AcceptRequestItemParametersJSON {
    formFieldResponse: string | number | boolean | string[];
}

@type("AcceptFormFieldRequestItemParameters")
export class AcceptFormFieldRequestItemParameters extends Serializable {
    @serialize()
    @validate()
    public formFieldResponse: string | number | boolean | string[];

    public static from(value: AcceptFormFieldRequestItemParametersJSON): AcceptFormFieldRequestItemParameters {
        return this.fromAny(value);
    }
}
