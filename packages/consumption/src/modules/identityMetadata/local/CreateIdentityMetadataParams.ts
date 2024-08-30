import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";
import { CoreAddress, ICoreAddress } from "@nmshd/core-types";

export interface ICreateIdentityMetadataParams extends ISerializable {
    key?: string;
    reference: ICoreAddress;
    value: ISerializable;
}

export class CreateIdentityMetadataParams extends Serializable implements ICreateIdentityMetadataParams {
    @validate({ nullable: true })
    @serialize()
    public key?: string;

    @validate()
    @serialize()
    public reference: CoreAddress;

    @validate()
    @serialize({ any: true })
    public value: Serializable;

    public static from(value: ICreateIdentityMetadataParams): CreateIdentityMetadataParams {
        return this.fromAny(value);
    }
}
