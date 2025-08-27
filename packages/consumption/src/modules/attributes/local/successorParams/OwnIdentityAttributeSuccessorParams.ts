import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { IdentityAttribute, IdentityAttributeJSON } from "@nmshd/content";

export interface OwnIdentityAttributeSuccessorParamsJSON {
    content: IdentityAttributeJSON;
}

export interface IOwnIdentityAttributeSuccessorParams extends ISerializable {
    content: IdentityAttribute;
}

@type("OwnIdentityAttributeSuccessorParams")
export class OwnIdentityAttributeSuccessorParams extends Serializable implements IOwnIdentityAttributeSuccessorParams {
    @validate()
    @serialize()
    public content: IdentityAttribute;

    public static from(value: IOwnIdentityAttributeSuccessorParams | OwnIdentityAttributeSuccessorParamsJSON): OwnIdentityAttributeSuccessorParams {
        return this.fromAny(value);
    }
}
