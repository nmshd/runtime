import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreId, ICoreId } from "@nmshd/core-types";
import { Identity, IIdentity } from "../../../accounts/data/Identity.js";

export interface IRelationshipCreationContentWrapper extends ISerializable {
    identity: IIdentity;
    content: ISerializable;
    templateId: ICoreId;
}

@type("RelationshipCreationContentWrapper")
export class RelationshipCreationContentWrapper extends Serializable implements IRelationshipCreationContentWrapper {
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
