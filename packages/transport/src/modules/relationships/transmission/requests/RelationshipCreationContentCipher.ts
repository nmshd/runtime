import { ISerializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreSerializable } from "@nmshd/core-types";
import { CryptoCipher, CryptoRelationshipPublicRequest, ICryptoCipher, ICryptoRelationshipPublicRequest } from "@nmshd/crypto";

export interface IRelationshipCreationContentCipher extends ISerializable {
    cipher: ICryptoCipher;
    publicCreationContentCrypto: ICryptoRelationshipPublicRequest;
}

@type("RelationshipCreationContentCipher")
export class RelationshipCreationContentCipher extends CoreSerializable implements IRelationshipCreationContentCipher {
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
        return super.fromBase64T<RelationshipCreationContentCipher>(value);
    }
}
