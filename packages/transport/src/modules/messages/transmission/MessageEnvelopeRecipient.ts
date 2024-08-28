import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreAddress, CoreDate, CoreId, ICoreAddress, ICoreDate, ICoreId } from "@nmshd/core-types";
import { CryptoCipher, ICryptoCipher } from "@nmshd/crypto";

export interface IMessageEnvelopeRecipient extends ISerializable {
    address: ICoreAddress;
    encryptedKey: ICryptoCipher;
    receivedAt?: ICoreDate;
    receivedByDevice?: ICoreId;
}

@type("MessageEnvelopeRecipient")
export class MessageEnvelopeRecipient extends Serializable implements IMessageEnvelopeRecipient {
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
