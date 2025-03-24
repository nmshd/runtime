import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";
import { CoreAddress, CoreDate, ICoreAddress, ICoreDate } from "@nmshd/core-types";
import { ContentJSON } from "../ContentJSON";

export enum SupportedVCTypes {
    W3CVC = "W3CVC",
    SdJwtVc = "SdJwtVc"
}

export interface AbstractAttributeJSON extends ContentJSON {
    owner: string;
    proof?: {
        credentialType: SupportedVCTypes;
        credential: unknown;
        proofInvalid?: true;
    };
    validFrom?: string;
    validTo?: string;
}

export interface IAbstractAttribute extends ISerializable {
    owner: ICoreAddress;
    proof?: { credentialType: SupportedVCTypes; credential: unknown; proofInvalid?: true };
    validFrom?: ICoreDate;
    validTo?: ICoreDate;
}

export abstract class AbstractAttribute extends Serializable implements IAbstractAttribute {
    @validate()
    @serialize()
    public owner: CoreAddress;

    @serialize()
    @validate({ nullable: true })
    public proof?: { credentialType: SupportedVCTypes; credential: unknown; proofInvalid?: true };

    @serialize()
    @validate({ nullable: true })
    public validFrom?: CoreDate;

    @serialize()
    @validate({ nullable: true })
    public validTo?: CoreDate;
}
