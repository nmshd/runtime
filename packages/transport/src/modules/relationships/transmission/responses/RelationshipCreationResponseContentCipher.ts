import { ISerializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreSerializable } from "@nmshd/core-types";
import { CryptoCipher, CryptoRelationshipPublicResponse, ICryptoCipher, ICryptoRelationshipPublicResponse } from "@nmshd/crypto";

export interface IRelationshipCreationResponseContentCipher extends ISerializable {
    cipher: ICryptoCipher;
    publicCreationResponseContentCrypto: ICryptoRelationshipPublicResponse;
}

@type("RelationshipCreationResponseContentCipher")
export class RelationshipCreationResponseContentCipher extends CoreSerializable implements IRelationshipCreationResponseContentCipher {
    @validate()
    @serialize()
    public cipher: CryptoCipher;

    @validate()
    @serialize()
    public publicCreationResponseContentCrypto: CryptoRelationshipPublicResponse;

    public static from(value: IRelationshipCreationResponseContentCipher): RelationshipCreationResponseContentCipher {
        return this.fromAny(value);
    }

    public static fromBase64(value: string): RelationshipCreationResponseContentCipher {
        return super.fromBase64T(value);
    }
}
