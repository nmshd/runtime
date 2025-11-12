import { Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreDate } from "@nmshd/core-types";
import { AcceptRequestItemParametersJSON } from "../../incoming/decide/AcceptRequestItemParameters.js";

export interface AcceptDeleteAttributeRequestItemParametersJSON extends AcceptRequestItemParametersJSON {
    deletionDate: string;
}

@type("AcceptDeleteAttributeRequestItemParameters")
export class AcceptDeleteAttributeRequestItemParameters extends Serializable {
    @serialize()
    @validate()
    public deletionDate: CoreDate;

    public static from(value: AcceptDeleteAttributeRequestItemParametersJSON): AcceptDeleteAttributeRequestItemParameters {
        return this.fromAny(value);
    }
}
