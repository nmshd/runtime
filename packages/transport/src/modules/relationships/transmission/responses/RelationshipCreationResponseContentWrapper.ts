import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreId, ICoreId } from "@nmshd/core-types";

export interface IRelationshipCreationResponseContentWrapper extends ISerializable {
    relationshipId: ICoreId;
}

@type("RelationshipCreationResponseContentWrapper")
export class RelationshipCreationResponseContentWrapper extends Serializable implements IRelationshipCreationResponseContentWrapper {
    @validate()
    @serialize()
    public relationshipId: CoreId;

    public static from(value: IRelationshipCreationResponseContentWrapper): RelationshipCreationResponseContentWrapper {
        return this.fromAny(value);
    }
}
