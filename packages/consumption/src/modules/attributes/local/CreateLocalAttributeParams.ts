import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";
import { IIdentityAttribute, IRelationshipAttribute, IdentityAttribute, IdentityAttributeJSON, RelationshipAttribute, RelationshipAttributeJSON } from "@nmshd/content";
import { CoreId, ICoreId } from "@nmshd/transport";
import { ILocalAttributeShareInfo, LocalAttributeShareInfo, LocalAttributeShareInfoJSON } from "./LocalAttributeShareInfo";

export interface CreateLocalAttributeParamsJSON {
    id?: string;
    content: IdentityAttributeJSON | RelationshipAttributeJSON;
    parentId?: string;
    succeeds?: string;
    shareInfo?: LocalAttributeShareInfoJSON;
}

export interface ICreateLocalAttributeParams extends ISerializable {
    id?: ICoreId;
    content: IIdentityAttribute | IRelationshipAttribute;
    parentId?: ICoreId;
    succeeds?: ICoreId;
    shareInfo?: ILocalAttributeShareInfo;
}

export class CreateLocalAttributeParams extends Serializable implements ICreateLocalAttributeParams {
    @serialize()
    @validate({ nullable: true })
    public id?: CoreId;

    @serialize({ unionTypes: [IdentityAttribute, RelationshipAttribute] })
    @validate()
    public content: IdentityAttribute | RelationshipAttribute;

    @serialize()
    @validate({ nullable: true })
    public parentId?: CoreId;

    @serialize()
    @validate({ nullable: true })
    public succeeds?: CoreId;

    @serialize()
    @validate({ nullable: true })
    public shareInfo?: LocalAttributeShareInfo;

    public static from(value: ICreateLocalAttributeParams | CreateLocalAttributeParamsJSON): CreateLocalAttributeParams {
        return this.fromAny(value);
    }
}
