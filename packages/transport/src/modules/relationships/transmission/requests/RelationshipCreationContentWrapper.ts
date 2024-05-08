import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreId, CoreSerializable, ICoreId, ICoreSerializable } from "../../../../core";
import { Identity, IIdentity } from "../../../accounts/data/Identity";

export interface IRelationshipCreationContentWrapper extends ICoreSerializable {
    identity: IIdentity;
    content: ISerializable;
    templateId: ICoreId;
}

@type("RelationshipCreationContentWrapper")
export class RelationshipCreationContentWrapper extends CoreSerializable implements IRelationshipCreationContentWrapper {
    @validate()
    @serialize()
    public identity: Identity;

    @validate()
    @serialize()
    public content: Serializable;

    @validate()
    @serialize()
    public templateId: CoreId;

    public static from(value: IRelationshipCreationContentWrapper): RelationshipCreationContentWrapper {
        return this.fromAny(value);
    }
}
