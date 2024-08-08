import { serialize, type, validate } from "@js-soft/ts-serval";
import { CryptoCipher, CryptoRelationshipPublicRequest, ICryptoCipher, ICryptoRelationshipPublicRequest } from "@nmshd/crypto";
import { CoreSerializable, ICoreSerializable } from "../../../../core";

export interface IRelationshipCreationContentCipher extends ICoreSerializable {
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
