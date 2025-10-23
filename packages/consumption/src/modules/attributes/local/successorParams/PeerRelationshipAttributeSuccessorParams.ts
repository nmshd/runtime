import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { RelationshipAttribute, RelationshipAttributeJSON } from "@nmshd/content";
import { CoreId, ICoreId } from "@nmshd/core-types";

export interface PeerRelationshipAttributeSuccessorParamsJSON {
    content: RelationshipAttributeJSON;
    id: string;
    sourceReference: string;
}

export interface IPeerRelationshipAttributeSuccessorParams extends ISerializable {
    content: RelationshipAttribute;
    id: ICoreId;
    sourceReference: ICoreId;
}

@type("PeerRelationshipAttributeSuccessorParams")
export class PeerRelationshipAttributeSuccessorParams extends Serializable implements IPeerRelationshipAttributeSuccessorParams {
    @validate()
    @serialize()
    public content: RelationshipAttribute;

    @validate()
    @serialize()
    public id: CoreId;

    @validate()
    @serialize()
    public sourceReference: CoreId;

    public static from(value: IPeerRelationshipAttributeSuccessorParams | PeerRelationshipAttributeSuccessorParamsJSON): PeerRelationshipAttributeSuccessorParams {
        return this.fromAny(value);
    }
}
