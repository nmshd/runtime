import { Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { OwnIdentityAttribute, OwnIdentityAttributeJSON } from "../../../attributes";
import { AcceptRequestItemParametersJSON } from "../../incoming/decide/AcceptRequestItemParameters";

export interface AcceptShareAuthorizationRequestRequestItemParametersJSON extends AcceptRequestItemParametersJSON {
    attribute: OwnIdentityAttributeJSON;
}

@type("AcceptShareAuthorizationRequestRequestItemParameters")
export class AcceptShareAuthorizationRequestRequestItemParameters extends Serializable {
    @serialize()
    @validate()
    public attribute: OwnIdentityAttribute;

    public static from(value: AcceptShareAuthorizationRequestRequestItemParametersJSON): AcceptShareAuthorizationRequestRequestItemParameters {
        return this.fromAny(value);
    }
}
