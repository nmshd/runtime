import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { IdentityAttribute, IdentityAttributeJSON, IIdentityAttribute, IRelationshipAttribute, RelationshipAttribute, RelationshipAttributeJSON } from "@nmshd/content";

export interface AbstractAttributeSuccessorParamsJSON {
    content: IdentityAttributeJSON | RelationshipAttributeJSON;
}

export interface IAbstractAttributeSuccessorParams extends ISerializable {
    content: IIdentityAttribute | IRelationshipAttribute;
}

// TODO: maybe we don't need this abstract class
@type("AbstractAttributeSuccessorParams")
export abstract class AbstractAttributeSuccessorParams extends Serializable implements IAbstractAttributeSuccessorParams {
    @validate()
    @serialize()
    public content: IdentityAttribute | RelationshipAttribute;
}
