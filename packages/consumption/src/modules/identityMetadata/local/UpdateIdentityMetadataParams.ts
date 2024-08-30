import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";
import { CoreAddress, ICoreAddress } from "@nmshd/core-types";

export interface IUpdateIdentityMetadataParams extends ISerializable {
    key?: string;
    reference: ICoreAddress;
    value: ISerializable;
    upsert?: boolean;
}

export class UpdateIdentityMetadataParams extends Serializable implements IUpdateIdentityMetadataParams {
    @validate({ nullable: true })
    @serialize()
    public key?: string;

    @validate()
    @serialize()
    public reference: CoreAddress;

    @validate()
    @serialize()
    public value: Serializable;

    @validate({ nullable: true })
    @serialize()
    public upsert?: boolean;

    public static from(value: IUpdateIdentityMetadataParams): UpdateIdentityMetadataParams {
        return this.fromAny(value);
    }
}
