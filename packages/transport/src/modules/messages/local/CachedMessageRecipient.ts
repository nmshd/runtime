import { serialize, type, validate } from "@js-soft/ts-serval";
import { CryptoCipher, ICryptoCipher } from "@nmshd/crypto";
import { CoreDate, CoreId, CoreSerializable, ICoreDate, ICoreId, ICoreSerializable } from "../../../core";
import { CoreAddress, ICoreAddress } from "../../../core/types/CoreAddress";

export interface ICachedMessageRecipient extends ICoreSerializable {
    address: ICoreAddress;
    encryptedKey: ICryptoCipher;
    receivedAt?: ICoreDate;
    receivedByDevice?: ICoreId;
    relationshipId?: ICoreId;
}

@type("CachedMessageRecipient")
export class CachedMessageRecipient extends CoreSerializable implements ICachedMessageRecipient {
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

    public static from(value: ICachedMessageRecipient): CachedMessageRecipient {
        return this.fromAny(value);
    }
}
