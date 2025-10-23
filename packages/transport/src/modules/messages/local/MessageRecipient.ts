import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreAddress, CoreDate, CoreId, ICoreAddress, ICoreDate, ICoreId } from "@nmshd/core-types";
import { CryptoCipher, ICryptoCipher } from "@nmshd/crypto";

export interface IMessageRecipient extends ISerializable {
    address: ICoreAddress;
    encryptedKey: ICryptoCipher;
    receivedAt?: ICoreDate;
    receivedByDevice?: ICoreId;
    relationshipId?: ICoreId;
}

@type("MessageRecipient")
export class MessageRecipient extends Serializable implements IMessageRecipient {
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

    @validate({ nullable: true })
    @serialize()
    public relationshipId?: CoreId;

    public static from(value: IMessageRecipient): MessageRecipient {
        return this.fromAny(value);
    }
}
