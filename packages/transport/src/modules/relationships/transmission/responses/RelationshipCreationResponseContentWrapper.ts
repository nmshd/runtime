import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreId, CoreSerializable, ICoreId, ICoreSerializable } from "../../../../core";

export interface IRelationshipCreationResponseContentWrapper extends ICoreSerializable {
    content: ISerializable;
    relationshipId: ICoreId;
}

@type("RelationshipCreationResponseContentWrapper")
export class RelationshipCreationResponseContentWrapper extends CoreSerializable implements IRelationshipCreationResponseContentWrapper {
    @validate()
    @serialize()
    public content: Serializable;

    @validate()
    @serialize()
    public relationshipId: CoreId;

    public static from(value: IRelationshipCreationResponseContentWrapper): RelationshipCreationResponseContentWrapper {
        return this.fromAny(value);
    }
}
