import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreBuffer, CryptoCipher, CryptoRelationshipPublicRequest, ICryptoCipher, ICryptoRelationshipPublicRequest } from "@nmshd/crypto";

export interface IRelationshipCreationContentCipher extends ISerializable {
    cipher: ICryptoCipher;
    publicCreationContentCrypto: ICryptoRelationshipPublicRequest;
}

@type("RelationshipCreationContentCipher")
export class RelationshipCreationContentCipher extends Serializable implements IRelationshipCreationContentCipher {
    @validate()
    @serialize()
    public cipher: CryptoCipher;

    @validate()
    @serialize()
    public publicCreationContentCrypto: CryptoRelationshipPublicRequest;

    public static from(value: IRelationshipCreationContentCipher): RelationshipCreationContentCipher {
        return this.fromAny(value);
    }

    public static fromBase64(value: string): RelationshipCreationContentCipher {
        const serialized = CoreBuffer.fromBase64URL(value).toUtf8();
        return (this as any).deserialize(serialized);
    }

    public toBase64(): string {
        return CoreBuffer.fromUtf8(this.serialize()).toBase64URL();
    }

    public static fromBase64Unknown(value: string): Serializable {
        const serialized = CoreBuffer.fromBase64URL(value).toUtf8();
        return Serializable.deserializeUnknown(serialized);
    }
}
