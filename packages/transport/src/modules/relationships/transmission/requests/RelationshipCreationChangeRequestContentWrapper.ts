import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreId, CoreSerializable, ICoreId, ICoreSerializable } from "../../../../core";
import { Identity, IIdentity } from "../../../accounts/data/Identity";

export interface IRelationshipCreationChangeRequestContentWrapper extends ICoreSerializable {
    identity: IIdentity;
    content: ISerializable;
    templateId: ICoreId;
}

@type("RelationshipCreationChangeRequestContentWrapper")
export class RelationshipCreationChangeRequestContentWrapper extends CoreSerializable implements IRelationshipCreationChangeRequestContentWrapper {
    @validate()
    @serialize()
    public identity: Identity;

    @validate()
    @serialize()
    public content: Serializable;

    @validate()
    @serialize()
    public templateId: CoreId;

    public static from(value: IRelationshipCreationChangeRequestContentWrapper): RelationshipCreationChangeRequestContentWrapper {
        return this.fromAny(value);
    }
}
