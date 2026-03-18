import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreDate, ICoreDate } from "@nmshd/core-types";
import { CryptoSecretKey, ICryptoSecretKey } from "@nmshd/crypto";
import { nameof } from "ts-simple-nameof";
import { CoreSynchronizable, ICoreSynchronizable } from "../../../core";
import { IPasswordProtection, PasswordProtection } from "../../../core/types/PasswordProtection";
import { TokenReference } from "../transmission/TokenReference";

export interface IEmptyToken extends ICoreSynchronizable {
    secretKey: ICryptoSecretKey;
    expiresAt: ICoreDate;
    passwordProtection: IPasswordProtection;
}

@type("EmptyToken")
export class EmptyToken extends CoreSynchronizable implements IEmptyToken {
    public override readonly technicalProperties = ["@type", "@context", nameof<EmptyToken>((r) => r.secretKey), nameof<EmptyToken>((r) => r.expiresAt)];
    public override readonly userdataProperties = [nameof<EmptyToken>((r) => r.passwordProtection)];

    @validate()
    @serialize()
    public secretKey: CryptoSecretKey;

    @validate()
    @serialize()
    public expiresAt: CoreDate;

    @validate()
    @serialize()
    public passwordProtection: PasswordProtection;

    public static from(value: IEmptyToken): EmptyToken {
        return this.fromAny(value);
    }

    public toTokenReference(backboneBaseUrl: string): TokenReference {
        return TokenReference.from({
            id: this.id,
            backboneBaseUrl,
            key: this.secretKey,
            passwordProtection: this.passwordProtection.toSharedPasswordProtection(true)
        });
    }
}
