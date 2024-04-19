import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreId, CoreSerializable, ICoreId, ICoreSerializable } from "../../../../core";

export interface IRelationshipAcceptanceContentWrapper extends ICoreSerializable {
    content: ISerializable;
    relationshipId: ICoreId;
}

@type("RelationshipAcceptanceContentWrapper")
export class RelationshipAcceptanceContentWrapper extends CoreSerializable implements IRelationshipAcceptanceContentWrapper {
    @validate()
    @serialize()
    public content: Serializable;

    @validate()
    @serialize()
    public relationshipId: CoreId;

    public static from(value: IRelationshipAcceptanceContentWrapper): RelationshipAcceptanceContentWrapper {
        return this.fromAny(value);
    }
}
