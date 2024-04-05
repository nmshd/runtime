import { serialize, type, validate } from "@js-soft/ts-serval";
import { CryptoCipher, CryptoRelationshipPublicResponse, ICryptoCipher, ICryptoRelationshipPublicResponse } from "@nmshd/crypto";
import { CoreSerializable, ICoreSerializable } from "../../../../core";

export interface IRelationshipCreationResponseCipher extends ICoreSerializable {
    cipher: ICryptoCipher;
    publicResponseCrypto?: ICryptoRelationshipPublicResponse;
}

@type("RelationshipCreationResponseCipher")
export class RelationshipCreationResponseCipher extends CoreSerializable implements IRelationshipCreationResponseCipher {
    @validate()
    @serialize()
    public cipher: CryptoCipher;

    @validate({ nullable: true })
    @serialize()
    public publicResponseCrypto?: CryptoRelationshipPublicResponse;

    public static from(value: IRelationshipCreationResponseCipher): RelationshipCreationResponseCipher {
        return this.fromAny(value);
    }

    public static fromBase64(value: string): RelationshipCreationResponseCipher {
        return super.fromBase64T(value);
    }
}
