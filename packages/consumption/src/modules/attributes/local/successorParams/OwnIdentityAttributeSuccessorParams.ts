import { serialize, type, validate } from "@js-soft/ts-serval";
import { IdentityAttribute, IdentityAttributeJSON } from "@nmshd/content";
import { AbstractAttributeSuccessorParams, AbstractAttributeSuccessorParamsJSON, IAbstractAttributeSuccessorParams } from "./AbstractAttributeSuccessorParams";

export interface OwnIdentityAttributeSuccessorParamsJSON extends AbstractAttributeSuccessorParamsJSON {
    content: IdentityAttributeJSON;
}

export interface IOwnIdentityAttributeSuccessorParams extends IAbstractAttributeSuccessorParams {
    content: IdentityAttribute;
}

// TODO: do we need this @type? And if so, it should probably also appear in the JSON
@type("OwnIdentityAttributeSuccessorParams")
export class OwnIdentityAttributeSuccessorParams extends AbstractAttributeSuccessorParams implements IOwnIdentityAttributeSuccessorParams {
    @validate()
    @serialize()
    public override content: IdentityAttribute;

    public static from(value: IOwnIdentityAttributeSuccessorParams | OwnIdentityAttributeSuccessorParamsJSON): OwnIdentityAttributeSuccessorParams {
        return this.fromAny(value);
    }
}
