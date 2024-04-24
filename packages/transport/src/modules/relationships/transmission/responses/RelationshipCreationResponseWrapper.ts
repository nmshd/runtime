import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreId, CoreSerializable, ICoreId, ICoreSerializable } from "../../../../core";

export interface IRelationshipCreationResponseWrapper extends ICoreSerializable {
    content: ISerializable;
    relationshipId: ICoreId;
}

@type("RelationshipCreationResponseWrapper")
export class RelationshipCreationResponseWrapper extends CoreSerializable implements IRelationshipCreationResponseWrapper {
    @validate()
    @serialize()
    public content: Serializable;

    @validate()
    @serialize()
    public relationshipId: CoreId;

    public static from(value: IRelationshipCreationResponseWrapper): RelationshipCreationResponseWrapper {
        return this.fromAny(value);
    }
}
