import { serialize, type, validate } from "@js-soft/ts-serval";
import { CryptoSignaturePublicKey, ICryptoSignaturePublicKey } from "@nmshd/crypto";
import { CoreAddress, CoreSerializable, ICoreSerializable } from "../../../core";

export interface IIdentity extends ICoreSerializable {
    address: CoreAddress;
    publicKey: ICryptoSignaturePublicKey;
}

@type("Identity")
export class Identity extends CoreSerializable implements IIdentity {
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
