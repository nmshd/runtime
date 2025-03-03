import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreAddress } from "@nmshd/core-types";
import { CryptoSignaturePublicKey, ICryptoSignaturePublicKey } from "@nmshd/crypto";

export interface IIdentity extends ISerializable {
    address: CoreAddress;
    publicKey: ICryptoSignaturePublicKey;
}

@type("Identity")
export class Identity extends Serializable implements IIdentity {
    @validate()
    @serialize()
    public address: CoreAddress;

    @validate()
    @serialize()
    public publicKey: CryptoSignaturePublicKey;

    public static from(value: IIdentity): Identity {
        return this.fromAny(value);
    }
}
