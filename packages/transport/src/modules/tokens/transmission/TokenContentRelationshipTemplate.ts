import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreAddress, CoreId, ICoreAddress, ICoreId } from "@nmshd/core-types";
import { CryptoSecretKey, ICryptoSecretKey } from "@nmshd/crypto";

export interface ITokenContentRelationshipTemplate extends ISerializable {
    templateId: ICoreId;
    secretKey: ICryptoSecretKey;
    forIdentity?: ICoreAddress;
    passwordType?: number;
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

    @validate({ nullable: true, min: 1, max: 12, customValidator: (v) => (!Number.isInteger(v) ? "must be an integer" : undefined) })
    @serialize()
    public passwordType?: number;

    public static from(value: ITokenContentRelationshipTemplate): TokenContentRelationshipTemplate {
        return this.fromAny(value);
    }
}
