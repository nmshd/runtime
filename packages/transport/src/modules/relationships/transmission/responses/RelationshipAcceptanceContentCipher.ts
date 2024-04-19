import { serialize, type, validate } from "@js-soft/ts-serval";
import { CryptoCipher, CryptoRelationshipPublicResponse, ICryptoCipher, ICryptoRelationshipPublicResponse } from "@nmshd/crypto";
import { CoreSerializable, ICoreSerializable } from "../../../../core";

export interface IRelationshipAcceptanceContentCipher extends ICoreSerializable {
    cipher: ICryptoCipher;
    publicAcceptanceContentCrypto?: ICryptoRelationshipPublicResponse;
}

@type("RelationshipAcceptanceContentCipher")
export class RelationshipAcceptanceContentCipher extends CoreSerializable implements IRelationshipAcceptanceContentCipher {
    @validate()
    @serialize()
    public cipher: CryptoCipher;

    @validate({ nullable: true })
    @serialize()
    public publicAcceptanceContentCrypto?: CryptoRelationshipPublicResponse;

    public static from(value: IRelationshipAcceptanceContentCipher): RelationshipAcceptanceContentCipher {
        return this.fromAny(value);
    }

    public static fromBase64(value: string): RelationshipAcceptanceContentCipher {
        return super.fromBase64T(value);
    }
}
