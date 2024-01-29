import { Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { AcceptRequestItemParametersJSON } from "../../incoming/decide/AcceptRequestItemParameters";

export interface AcceptFreeTextRequestItemParametersJSON extends AcceptRequestItemParametersJSON {
    freeText: string;
}

@type("FreeTextRequestItemParameters")
export class AcceptFreeTextRequestItemParameters extends Serializable {
    @serialize()
    @validate()
    public freeText: string;

    public static from(value: AcceptFreeTextRequestItemParametersJSON): AcceptFreeTextRequestItemParameters {
        return this.fromAny(value);
    }
}
