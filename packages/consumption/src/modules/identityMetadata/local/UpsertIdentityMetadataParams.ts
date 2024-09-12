import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";
import { CoreAddress, ICoreAddress } from "@nmshd/core-types";

export interface IUpsertIdentityMetadataParams extends ISerializable {
    key?: string;
    reference: ICoreAddress;
    value: ISerializable;
}

export class UpsertIdentityMetadataParams extends Serializable implements IUpsertIdentityMetadataParams {
    @validate({ nullable: true })
    @serialize()
    public key?: string;

    @validate()
    @serialize()
    public reference: CoreAddress;

    @validate()
    @serialize({ any: true })
    public value: Serializable;

    public static from(value: IUpsertIdentityMetadataParams): UpsertIdentityMetadataParams {
        return this.fromAny(value);
    }
}
