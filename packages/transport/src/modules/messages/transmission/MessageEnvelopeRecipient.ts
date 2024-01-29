import { serialize, type, validate } from "@js-soft/ts-serval";
import { CryptoCipher, ICryptoCipher } from "@nmshd/crypto";
import { CoreDate, CoreId, CoreSerializable, ICoreDate, ICoreId, ICoreSerializable } from "../../../core";
import { CoreAddress, ICoreAddress } from "../../../core/types/CoreAddress";

export interface IMessageEnvelopeRecipient extends ICoreSerializable {
    address: ICoreAddress;
    encryptedKey: ICryptoCipher;
    receivedAt?: ICoreDate;
    receivedByDevice?: ICoreId;
}

@type("MessageEnvelopeRecipient")
export class MessageEnvelopeRecipient extends CoreSerializable implements IMessageEnvelopeRecipient {
    @validate()
    @serialize()
    public address: CoreAddress;

    @validate()
    @serialize()
    public encryptedKey: CryptoCipher;

    @validate({ nullable: true })
    @serialize()
    public receivedAt?: CoreDate;

    @validate({ nullable: true })
    @serialize()
    public receivedByDevice?: CoreId;

    public static from(value: IMessageEnvelopeRecipient): MessageEnvelopeRecipient {
        return this.fromAny(value);
    }
}
