import { serialize, type, validate } from "@js-soft/ts-serval";
import { CryptoSecretKey, ICryptoSecretKey } from "@nmshd/crypto";
import { CoreAddress, CoreId, CoreSerializable, ICoreAddress, ICoreId, ICoreSerializable } from "../../../core";

export interface ITokenContentRelationshipTemplate extends ICoreSerializable {
    templateId: ICoreId;
    secretKey: ICryptoSecretKey;
    forIdentity?: ICoreAddress;
}

@type("TokenContentRelationshipTemplate")
export class TokenContentRelationshipTemplate extends CoreSerializable implements ITokenContentRelationshipTemplate {
    @validate()
    @serialize()
    public templateId: CoreId;

    @validate()
    @serialize()
    public secretKey: CryptoSecretKey;

    @validate()
    @serialize()
    public forIdentity?: CoreAddress;

    public static from(value: ITokenContentRelationshipTemplate): TokenContentRelationshipTemplate {
        return this.fromAny(value);
    }
}
