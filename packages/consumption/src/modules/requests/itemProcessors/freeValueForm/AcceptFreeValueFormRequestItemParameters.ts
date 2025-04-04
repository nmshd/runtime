import { Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { AcceptRequestItemParametersJSON } from "../../incoming/decide/AcceptRequestItemParameters";

export interface AcceptFreeValueFormRequestItemParametersJSON extends AcceptRequestItemParametersJSON {
    freeValue: string;
}

@type("AcceptFreeValueFormRequestItemParameters")
export class AcceptFreeValueFormRequestItemParameters extends Serializable {
    @serialize()
    @validate()
    public freeValue: string;

    public static from(value: AcceptFreeValueFormRequestItemParametersJSON): AcceptFreeValueFormRequestItemParameters {
        return this.fromAny(value);
    }
}
