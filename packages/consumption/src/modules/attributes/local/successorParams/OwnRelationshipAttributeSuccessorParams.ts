import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { RelationshipAttribute, RelationshipAttributeJSON } from "@nmshd/content";
import { CoreId, ICoreId } from "@nmshd/core-types";

export interface OwnRelationshipAttributeSuccessorParamsJSON {
    content: RelationshipAttributeJSON;
    sourceReference: string;
}

export interface IOwnRelationshipAttributeSuccessorParams extends ISerializable {
    content: RelationshipAttribute;
    sourceReference: ICoreId;
}

@type("OwnRelationshipAttributeSuccessorParams")
export class OwnRelationshipAttributeSuccessorParams extends Serializable implements IOwnRelationshipAttributeSuccessorParams {
    @validate()
    @serialize()
    public content: RelationshipAttribute;

    @validate()
    @serialize()
    public sourceReference: CoreId;

    public static from(value: IOwnRelationshipAttributeSuccessorParams | OwnRelationshipAttributeSuccessorParamsJSON): OwnRelationshipAttributeSuccessorParams {
        return this.fromAny(value);
    }
}
