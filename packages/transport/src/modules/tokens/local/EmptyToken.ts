import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreDate, CoreId, ICoreDate, ICoreId } from "@nmshd/core-types";
import { CryptoSecretKey, ICryptoSecretKey } from "@nmshd/crypto";
import { IPasswordProtection, PasswordProtection } from "../../../core/types/PasswordProtection";
import { TokenReference } from "../transmission/TokenReference";

export interface IEmptyToken extends ISerializable {
    id: ICoreId;
    secretKey: ICryptoSecretKey;
    expiresAt: ICoreDate;
    passwordProtection?: IPasswordProtection;
}

@type("EmptyToken")
export class EmptyToken extends Serializable implements IEmptyToken {
    @validate()
    @serialize()
    public id: CoreId;

    @validate()
    @serialize()
    public secretKey: CryptoSecretKey;

    @validate()
    @serialize()
    public expiresAt: CoreDate;

    @validate({ nullable: true })
    @serialize()
    public passwordProtection?: PasswordProtection;

    public static from(value: IEmptyToken): EmptyToken {
        return this.fromAny(value);
    }

    public toTokenReference(backboneBaseUrl: string): TokenReference {
        return TokenReference.from({
            id: this.id,
            backboneBaseUrl,
            key: this.secretKey,
            passwordProtection: this.passwordProtection?.toSharedPasswordProtection(true)
        });
    }
}
