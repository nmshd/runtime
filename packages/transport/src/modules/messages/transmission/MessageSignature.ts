import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreAddress, ICoreAddress } from "@nmshd/core-types";
import { CryptoSignature, ICryptoSignature } from "@nmshd/crypto";

export interface IMessageSignature extends ISerializable {
    recipient: ICoreAddress;
    signature: ICryptoSignature;
}

@type("MessageSignature")
export class MessageSignature extends Serializable implements IMessageSignature {
    @validate()
    @serialize()
    public recipient: CoreAddress;

    @validate()
    @serialize({ enforceString: true })
    public signature: CryptoSignature;

    public static from(value: IMessageSignature): MessageSignature {
        return this.fromAny(value);
    }
}
