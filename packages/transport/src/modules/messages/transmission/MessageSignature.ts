import { serialize, type, validate } from "@js-soft/ts-serval";
import { CryptoSignature, ICryptoSignature } from "@nmshd/crypto";
import { CoreAddress, CoreSerializable, ICoreAddress, ICoreSerializable } from "../../../core";

export interface IMessageSignature extends ICoreSerializable {
    recipient: ICoreAddress;
    signature: ICryptoSignature;
}

@type("MessageSignature")
export class MessageSignature extends CoreSerializable implements IMessageSignature {
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
