import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreAddress, CoreSynchronizable, ICoreAddress, ICoreSynchronizable } from "@nmshd/transport";
import { nameof } from "ts-simple-nameof";

export interface IdentityMetadataJSON {
    key?: string;
    reference: string;
    value: any;
}

export interface IIdentityMetadata extends ICoreSynchronizable {
    key?: string;
    reference: ICoreAddress;
    value: ISerializable;
}

@type("IdentityMetadata")
export class IdentityMetadata extends CoreSynchronizable implements IIdentityMetadata {
    public override readonly technicalProperties = ["@type", "@context", nameof<IdentityMetadata>((r) => r.key), nameof<IdentityMetadata>((r) => r.reference)];
    public override readonly userdataProperties = [nameof<IdentityMetadata>((r) => r.value)];

    @validate({ nullable: true })
    @serialize()
    public key?: string;

    @validate()
    @serialize()
    public reference: CoreAddress;

    @validate()
    @serialize()
    public value: Serializable;

    public static from(value: IIdentityMetadata | IdentityMetadataJSON): IdentityMetadata {
        return this.fromAny(value);
    }
}
