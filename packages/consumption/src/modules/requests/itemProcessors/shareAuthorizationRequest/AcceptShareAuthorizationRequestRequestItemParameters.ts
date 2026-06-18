import { Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreId } from "@nmshd/core-types";
import { AcceptRequestItemParametersJSON } from "../../incoming/decide/AcceptRequestItemParameters";

export interface AcceptShareAuthorizationRequestRequestItemParametersJSON extends AcceptRequestItemParametersJSON {
    attributeId: string;
}

@type("AcceptShareAuthorizationRequestRequestItemParameters")
export class AcceptShareAuthorizationRequestRequestItemParameters extends Serializable {
    @serialize()
    @validate()
    public attributeId: CoreId;

    public static from(value: AcceptShareAuthorizationRequestRequestItemParametersJSON): AcceptShareAuthorizationRequestRequestItemParameters {
        return this.fromAny(value);
    }
}
