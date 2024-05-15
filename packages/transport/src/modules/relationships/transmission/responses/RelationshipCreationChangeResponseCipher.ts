import { serialize, type, validate } from "@js-soft/ts-serval";
import { CryptoCipher, CryptoRelationshipPublicResponse, ICryptoCipher, ICryptoRelationshipPublicResponse } from "@nmshd/crypto";
import { CoreSerializable, ICoreSerializable } from "../../../../core";

export interface IRelationshipCreationChangeResponseCipher extends ICoreSerializable {
    cipher: ICryptoCipher;
    publicResponseCrypto?: ICryptoRelationshipPublicResponse;
}

@type("RelationshipCreationChangeResponseCipher")
export class RelationshipCreationChangeResponseCipher extends CoreSerializable implements IRelationshipCreationChangeResponseCipher {
    @validate()
    @serialize()
    public cipher: CryptoCipher;

    @validate({ nullable: true })
    @serialize()
    public publicResponseCrypto?: CryptoRelationshipPublicResponse;

    public static from(value: IRelationshipCreationChangeResponseCipher): RelationshipCreationChangeResponseCipher {
        return this.fromAny(value);
    }

    public static fromBase64(value: string): RelationshipCreationChangeResponseCipher {
        return super.fromBase64T(value);
    }
}
