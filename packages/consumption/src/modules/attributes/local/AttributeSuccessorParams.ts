import { Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { IdentityAttribute, RelationshipAttribute } from "@nmshd/content";
import { CoreDate, CoreId, ICoreDate, ICoreId } from "@nmshd/core-types";
import { ILocalAttribute, LocalAttributeJSON } from "./LocalAttribute";
import { LocalAttributeShareInfo } from "./LocalAttributeShareInfo";

export type IAttributeSuccessorParams = Omit<ILocalAttribute, "id" | "createdAt"> & {
    id?: ICoreId;
    createdAt?: ICoreDate;
};

export type AttributeSuccessorParamsJSON = Omit<LocalAttributeJSON, "id" | "createdAt"> & {
    id?: string;
    createdAt?: string;
};

@type("AttributeSuccessorParams")
export class AttributeSuccessorParams extends Serializable implements IAttributeSuccessorParams {
    @validate({ nullable: true })
    @serialize()
    public id?: CoreId;

    @validate()
    @serialize({ unionTypes: [IdentityAttribute, RelationshipAttribute] })
    public content: IdentityAttribute | RelationshipAttribute;

    @validate({ nullable: true })
    @serialize()
    public createdAt?: CoreDate;

    @validate({ nullable: true })
    @serialize()
    public succeeds?: CoreId;

    @validate({ nullable: true })
    @serialize()
    public succeededBy?: CoreId;

    @validate({ nullable: true })
    @serialize()
    public shareInfo?: LocalAttributeShareInfo;

    public static from(value: IAttributeSuccessorParams | AttributeSuccessorParamsJSON): AttributeSuccessorParams {
        return this.fromAny(value);
    }
}
