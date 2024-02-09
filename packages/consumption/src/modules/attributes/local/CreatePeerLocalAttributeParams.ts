import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";
import { IIdentityAttribute, IRelationshipAttribute, IdentityAttribute, IdentityAttributeJSON, RelationshipAttribute, RelationshipAttributeJSON } from "@nmshd/content";
import { CoreAddress, CoreId, ICoreAddress, ICoreId } from "@nmshd/transport";

export interface CreatePeerLocalAttributeParamsJSON {
    id: string;
    content: IdentityAttributeJSON | RelationshipAttributeJSON;
    requestReferece: string;
    peer: string;
}

export interface ICreatePeerLocalAttributeParams extends ISerializable {
    id?: ICoreId; // needs to be optional because sometimes (e.g. when accepting a CreateAttributeRequestItem) the id is not known yet
    content: IIdentityAttribute | IRelationshipAttribute;
    requestReference: ICoreId;
    peer: ICoreAddress;
}

export class CreatePeerLocalAttributeParams extends Serializable implements ICreatePeerLocalAttributeParams {
    @serialize()
    @validate()
    public id: CoreId;

    @serialize({ unionTypes: [IdentityAttribute, RelationshipAttribute] })
    @validate()
    public content: IdentityAttribute | RelationshipAttribute;

    @serialize()
    @validate()
    public requestReference: CoreId;

    @serialize()
    @validate()
    public peer: CoreAddress;

    public static from(value: ICreatePeerLocalAttributeParams | CreatePeerLocalAttributeParamsJSON): CreatePeerLocalAttributeParams {
        return this.fromAny(value);
    }
}
