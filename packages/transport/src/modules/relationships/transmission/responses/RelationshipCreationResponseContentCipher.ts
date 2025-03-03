import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreBuffer, CryptoCipher, CryptoRelationshipPublicResponse, ICryptoCipher, ICryptoRelationshipPublicResponse } from "@nmshd/crypto";

export interface IRelationshipCreationResponseContentCipher extends ISerializable {
    cipher: ICryptoCipher;
    publicCreationResponseContentCrypto: ICryptoRelationshipPublicResponse;
}

@type("RelationshipCreationResponseContentCipher")
export class RelationshipCreationResponseContentCipher extends Serializable implements IRelationshipCreationResponseContentCipher {
    @validate()
    @serialize()
    public cipher: CryptoCipher;

    @validate()
    @serialize()
    public publicCreationResponseContentCrypto: CryptoRelationshipPublicResponse;

    public static from(value: IRelationshipCreationResponseContentCipher): RelationshipCreationResponseContentCipher {
        return this.fromAny(value);
    }

    public toBase64(): string {
        return CoreBuffer.fromUtf8(this.serialize()).toBase64URL();
    }

    public static fromBase64(value: string): RelationshipCreationResponseContentCipher {
        const serialized = CoreBuffer.fromBase64URL(value).toUtf8();
        return (this as any).deserialize(serialized);
    }
}
