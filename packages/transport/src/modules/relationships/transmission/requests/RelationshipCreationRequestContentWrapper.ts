import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreId, CoreSerializable, ICoreId, ICoreSerializable } from "../../../../core";
import { Identity, IIdentity } from "../../../accounts/data/Identity";

export interface IRelationshipCreationRequestContentWrapper extends ICoreSerializable {
    identity: IIdentity;
    content: ISerializable;
    templateId: ICoreId;
}

@type("RelationshipCreationRequestContentWrapper")
export class RelationshipCreationRequestContentWrapper extends CoreSerializable implements IRelationshipCreationRequestContentWrapper {
    @validate()
    @serialize()
    public identity: Identity;

    @validate()
    @serialize()
    public content: Serializable;

    @validate()
    @serialize()
    public templateId: CoreId;

    public static from(value: IRelationshipCreationRequestContentWrapper): RelationshipCreationRequestContentWrapper {
        return this.fromAny(value);
    }
}
