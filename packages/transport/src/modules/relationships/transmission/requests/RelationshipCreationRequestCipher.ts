import { serialize, type, validate } from "@js-soft/ts-serval";
import { CryptoCipher, CryptoRelationshipPublicRequest, ICryptoCipher, ICryptoRelationshipPublicRequest } from "@nmshd/crypto";
import { CoreSerializable, ICoreSerializable } from "../../../../core";

export interface IRelationshipCreationRequestCipher extends ICoreSerializable {
    cipher: ICryptoCipher;
    publicRequestCrypto: ICryptoRelationshipPublicRequest;
}

@type("RelationshipCreationRequestCipher")
export class RelationshipCreationRequestCipher extends CoreSerializable implements IRelationshipCreationRequestCipher {
    @validate()
    @serialize()
    public cipher: CryptoCipher;

    @validate()
    @serialize()
    public publicRequestCrypto: CryptoRelationshipPublicRequest;

    public static from(value: IRelationshipCreationRequestCipher): RelationshipCreationRequestCipher {
        return this.fromAny(value);
    }

    public static fromBase64(value: string): RelationshipCreationRequestCipher {
        return super.fromBase64T<RelationshipCreationRequestCipher>(value);
    }
}
