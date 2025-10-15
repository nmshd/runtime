import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";
import { IIdentityAttribute, IRelationshipAttribute, IdentityAttribute, IdentityAttributeJSON, RelationshipAttribute, RelationshipAttributeJSON } from "@nmshd/content";
import { CoreAddress, CoreId, ICoreAddress, ICoreId } from "@nmshd/core-types";

export interface CreateSharedLocalAttributeParamsJSON {
    id?: string;
    content: IdentityAttributeJSON | RelationshipAttributeJSON;
    requestReference: string;
    peer: string;
    thirdPartyAddress?: string;
}

export interface ICreateSharedLocalAttributeParams extends ISerializable {
    id?: ICoreId; // needs to be optional because sometimes (e.g. when accepting a CreateAttributeRequestItem) the id is not known yet
    content: IIdentityAttribute | IRelationshipAttribute;
    requestReference: ICoreId;
    peer: ICoreAddress;
    thirdPartyAddress?: ICoreAddress;
}

export class CreateSharedLocalAttributeParams extends Serializable implements ICreateSharedLocalAttributeParams {
    @serialize()
    @validate({ nullable: true })
    public id?: CoreId;

    @serialize({ unionTypes: [IdentityAttribute, RelationshipAttribute] })
    @validate()
    public content: IdentityAttribute | RelationshipAttribute;

    @serialize()
    @validate()
    public requestReference: CoreId;

    @serialize()
    @validate()
    public peer: CoreAddress;

    @serialize()
    @validate({ nullable: true })
    public thirdPartyAddress?: CoreAddress;

    public static from(value: ICreateSharedLocalAttributeParams | CreateSharedLocalAttributeParamsJSON): CreateSharedLocalAttributeParams {
        return this.fromAny(value);
    }
}
