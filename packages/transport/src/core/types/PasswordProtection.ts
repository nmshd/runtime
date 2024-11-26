import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";
import { CoreBuffer, ICoreBuffer } from "@nmshd/crypto";
import { PasswordProtectionCreationParameters } from "./PasswordProtectionCreationParameters";
import { SharedPasswordProtection } from "./SharedPasswordProtection";

export interface IPasswordProtection extends ISerializable {
    passwordType: string;
    salt: ICoreBuffer;
    password: string;
}

export class PasswordProtection extends Serializable implements IPasswordProtection {
    @validate({ regExp: /^(pw|pin(4|5|6|7|8|9|10|11|12|13|14|15|16))$/ })
    @serialize()
    public passwordType: string;

    @validate({ customValidator: (v: ICoreBuffer) => (v.buffer.byteLength === 16 ? undefined : "must be 16 bytes long") })
    @serialize()
    public salt: CoreBuffer;

    @validate({ min: 1 })
    @serialize()
    public password: string;

    public static from(value: IPasswordProtection): PasswordProtection {
        return this.fromAny(value);
    }

    public toSharedPasswordProtection(): SharedPasswordProtection {
        return SharedPasswordProtection.from({
            passwordType: this.passwordType,
            salt: this.salt
        });
    }

    private matchesCreationParameters(compare: PasswordProtectionCreationParameters): boolean {
        return this.passwordType === compare.passwordType && this.password === compare.password;
    }

    public matchesInputForNewPassword(compare: { password: string; passwordIsPin?: true } | undefined): boolean {
        const compareCreationParameters = PasswordProtectionCreationParameters.create(compare);
        if (!compareCreationParameters) return false;

        return this.matchesCreationParameters(compareCreationParameters);
    }
}
