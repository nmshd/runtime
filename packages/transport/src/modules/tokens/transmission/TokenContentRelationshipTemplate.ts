import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreId, ICoreId } from "@nmshd/core-types";
import { CryptoSecretKey, ICryptoSecretKey } from "@nmshd/crypto";

export interface ITokenContentRelationshipTemplate extends ISerializable {
    templateId: ICoreId;
    secretKey: ICryptoSecretKey;
}

@type("TokenContentRelationshipTemplate")
export class TokenContentRelationshipTemplate extends Serializable implements ITokenContentRelationshipTemplate {
    @validate()
    @serialize()
    public templateId: CoreId;

    @validate()
    @serialize()
    public secretKey: CryptoSecretKey;

    public static from(value: ITokenContentRelationshipTemplate): TokenContentRelationshipTemplate {
        return this.fromAny(value);
    }
}
