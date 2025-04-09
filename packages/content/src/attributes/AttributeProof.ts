import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";
import { CoreAddress, CoreDate, ICoreAddress, ICoreDate } from "@nmshd/core-types";

export enum SupportedVCTypes {
    W3CVC = "W3CVC",
    SdJwtVc = "SdJwtVc"
}

export interface AttributeProofJSON {
    credentialType: SupportedVCTypes;
    credential: unknown;
    proofInvalid?: true;
    expiresAt?: string;
    issuer: string;
}

export interface IAttributeProof extends ISerializable {
    credentialType: SupportedVCTypes;
    credential: unknown;
    proofInvalid?: true;
    expiresAt?: ICoreDate;
    issuer: ICoreAddress;
}

export class AttributeProof extends Serializable implements IAttributeProof {
    @validate()
    @serialize()
    public credentialType: SupportedVCTypes;

    @validate()
    @serialize({ any: true })
    public credential: unknown;

    @validate({ nullable: true })
    @serialize()
    public proofInvalid?: true;

    @validate({ nullable: true })
    @serialize()
    public expiresAt?: CoreDate;

    @validate()
    @serialize()
    public issuer: CoreAddress;

    public static from(value: IAttributeProof): AttributeProof {
        return this.fromAny(value);
    }
}
