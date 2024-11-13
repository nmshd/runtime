import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreAddress, CoreId, ICoreAddress, ICoreId } from "@nmshd/core-types";
import { CryptoSecretKey, ICryptoSecretKey } from "@nmshd/crypto";
import { IReducedPasswordInfo, ReducedPasswordInfo } from "../../../core/types/PasswordInfo";

export interface ITokenContentRelationshipTemplate extends ISerializable {
    templateId: ICoreId;
    secretKey: ICryptoSecretKey;
    forIdentity?: ICoreAddress;
    passwordInfo?: IReducedPasswordInfo;
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

    @validate({ nullable: true })
    @serialize()
    public passwordInfo?: ReducedPasswordInfo;

    public static from(value: ITokenContentRelationshipTemplate): TokenContentRelationshipTemplate {
        return this.fromAny(value);
    }
}
