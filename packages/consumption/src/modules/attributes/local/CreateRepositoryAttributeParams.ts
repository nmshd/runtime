import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";
import { IIdentityAttribute, IdentityAttribute, IdentityAttributeJSON, RelationshipAttribute } from "@nmshd/content";
import { CoreId, ICoreId } from "@nmshd/core-types";

export interface CreateRepositoryAttributeParamsJSON {
    id?: string;
    content: IdentityAttributeJSON;
}

export interface ICreateRepositoryAttributeParams extends ISerializable {
    id?: ICoreId;
    content: IIdentityAttribute;
}

export class CreateRepositoryAttributeParams extends Serializable implements ICreateRepositoryAttributeParams {
    @serialize()
    @validate({ nullable: true })
    public id?: CoreId;

    @serialize({ unionTypes: [IdentityAttribute, RelationshipAttribute] })
    @validate()
    public content: IdentityAttribute;

    public static from(value: ICreateRepositoryAttributeParams | CreateRepositoryAttributeParamsJSON): CreateRepositoryAttributeParams {
        return this.fromAny(value);
    }
}
