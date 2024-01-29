import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreId, CoreSerializable, ICoreId, ICoreSerializable } from "../../../../core";

export interface IRelationshipCreationChangeResponseContentWrapper extends ICoreSerializable {
    content: ISerializable;
    relationshipId: ICoreId;
}

@type("RelationshipCreationChangeResponseContentWrapper")
export class RelationshipCreationChangeResponseContentWrapper extends CoreSerializable implements IRelationshipCreationChangeResponseContentWrapper {
    @validate()
    @serialize()
    public content: Serializable;

    @validate()
    @serialize()
    public relationshipId: CoreId;

    public static from(value: IRelationshipCreationChangeResponseContentWrapper): RelationshipCreationChangeResponseContentWrapper {
        return this.fromAny(value);
    }
}
