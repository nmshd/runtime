import { serialize, type, validate } from "@js-soft/ts-serval";
import { CryptoCipher, CryptoRelationshipPublicResponse, ICryptoCipher, ICryptoRelationshipPublicResponse } from "@nmshd/crypto";
import { CoreSerializable, ICoreSerializable } from "../../../../core";

export interface IRelationshipCreationResponseContentCipher extends ICoreSerializable {
    cipher: ICryptoCipher;
    publicCreationResponseContentCrypto?: ICryptoRelationshipPublicResponse;
}

@type("RelationshipCreationResponseContentCipher")
export class RelationshipCreationResponseContentCipher extends CoreSerializable implements IRelationshipCreationResponseContentCipher {
    @validate()
    @serialize()
    public cipher: CryptoCipher;

    @validate({ nullable: true })
    @serialize()
    public publicCreationResponseContentCrypto?: CryptoRelationshipPublicResponse;

    public static from(value: IRelationshipCreationResponseContentCipher): RelationshipCreationResponseContentCipher {
        return this.fromAny(value);
    }

    public static fromBase64(value: string): RelationshipCreationResponseContentCipher {
        return super.fromBase64T(value);
    }
}
