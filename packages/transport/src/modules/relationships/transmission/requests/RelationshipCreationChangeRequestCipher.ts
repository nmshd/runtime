import { serialize, type, validate } from "@js-soft/ts-serval";
import { CryptoCipher, CryptoRelationshipPublicRequest, ICryptoCipher, ICryptoRelationshipPublicRequest } from "@nmshd/crypto";
import { CoreSerializable, ICoreSerializable } from "../../../../core";

export interface IRelationshipCreationChangeRequestCipher extends ICoreSerializable {
    cipher: ICryptoCipher;
    publicRequestCrypto: ICryptoRelationshipPublicRequest;
}

@type("RelationshipCreationChangeRequestCipher")
export class RelationshipCreationChangeRequestCipher extends CoreSerializable implements IRelationshipCreationChangeRequestCipher {
    @validate()
    @serialize()
    public cipher: CryptoCipher;

    @validate()
    @serialize()
    public publicRequestCrypto: CryptoRelationshipPublicRequest;

    public static from(value: IRelationshipCreationChangeRequestCipher): RelationshipCreationChangeRequestCipher {
        return this.fromAny(value);
    }

    public static fromBase64(value: string): RelationshipCreationChangeRequestCipher {
        return super.fromBase64T<RelationshipCreationChangeRequestCipher>(value);
    }
}
