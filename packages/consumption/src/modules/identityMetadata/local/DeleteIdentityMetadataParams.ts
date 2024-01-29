import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";
import { CoreAddress, ICoreAddress } from "@nmshd/transport";

export interface IDeleteIdentityMetadataParams extends ISerializable {
    key?: string;
    reference: ICoreAddress;
}

export class DeleteIdentityMetadataParams extends Serializable implements IDeleteIdentityMetadataParams {
    @validate({ nullable: true })
    @serialize()
    public key?: string;

    @validate()
    @serialize()
    public reference: CoreAddress;

    public static from(value: IDeleteIdentityMetadataParams): DeleteIdentityMetadataParams {
        return this.fromAny(value);
    }
}
