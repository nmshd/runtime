import { Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { AcceptRequestItemParametersJSON } from "../../incoming/decide/AcceptRequestItemParameters";

export interface AcceptDeleteAttributeRequestItemParametersJSON extends AcceptRequestItemParametersJSON {
    deletionDate: string;
}

@type("AcceptDeleteAttributeRequestItemParameters")
export class AcceptDeleteAttributeRequestItemParameters extends Serializable {
    @serialize()
    @validate()
    public deletionDate: string;

    public static from(value: AcceptDeleteAttributeRequestItemParametersJSON): AcceptDeleteAttributeRequestItemParameters {
        return this.fromAny(value);
    }
}
