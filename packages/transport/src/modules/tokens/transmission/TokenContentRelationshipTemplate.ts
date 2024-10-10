import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreAddress, CoreId, ICoreAddress, ICoreId } from "@nmshd/core-types";
import { CryptoSecretKey, ICryptoSecretKey } from "@nmshd/crypto";

export interface ITokenContentRelationshipTemplate extends ISerializable {
    templateId: ICoreId;
    secretKey: ICryptoSecretKey;
    forIdentity?: ICoreAddress;
}

@type("TokenContentRelationshipTemplate")
export class TokenContentRelationshipTemplate extends Serializable implements ITokenContentRelationshipTemplate {
    @validate()
    @serialize()
    public templateId: CoreId;

    @validate()
    @serialize()
    public secretKey: CryptoSecretKey;

    @validate({ nullable: true })
    @serialize()
    public forIdentity?: CoreAddress;

    public static from(value: ITokenContentRelationshipTemplate): TokenContentRelationshipTemplate {
        return this.fromAny(value);
    }
}
