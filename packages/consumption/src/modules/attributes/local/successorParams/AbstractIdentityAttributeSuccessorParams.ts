import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { IdentityAttribute, IdentityAttributeJSON, IIdentityAttribute, IRelationshipAttribute, RelationshipAttribute, RelationshipAttributeJSON } from "@nmshd/content";
import { CoreId, ICoreId } from "@nmshd/core-types";

// TODO: put into index file and check all imports (after adding folders)
export interface AbstractAttributeSuccessorParamsJSON {
    content: IdentityAttributeJSON | RelationshipAttributeJSON;
    id?: string;
}

export interface IAbstractAttributeSuccessorParams extends ISerializable {
    content: IIdentityAttribute | IRelationshipAttribute;
    id?: ICoreId;
}

@type("AbstractAttributeSuccessorParams")
export abstract class AbstractAttributeSuccessorParams extends Serializable implements IAbstractAttributeSuccessorParams {
    @validate()
    @serialize()
    public content: IdentityAttribute | RelationshipAttribute;

    @validate({ nullable: true })
    @serialize()
    public id?: CoreId;
}
