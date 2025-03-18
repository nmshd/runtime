import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";
import { SharedPasswordProtection } from "@nmshd/core-types";
import { CoreBuffer, ICoreBuffer } from "@nmshd/crypto";
import { PasswordProtectionCreationParameters } from "./PasswordProtectionCreationParameters";

export interface IPasswordProtection extends ISerializable {
    passwordType: "pw" | `pin${number}`;
    salt: ICoreBuffer;
    password: string;
}

export class PasswordProtection extends Serializable implements IPasswordProtection {
    @validate({ regExp: /^(pw|pin(4|5|6|7|8|9|10|11|12|13|14|15|16))$/ })
    @serialize()
    public passwordType: "pw" | `pin${number}`;

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

    public matchesInputForNewPasswordProtection(newPasswordProtection: { password: string; passwordIsPin?: true } | undefined): boolean {
        const newCreationParameters = PasswordProtectionCreationParameters.create(newPasswordProtection);
        if (!newCreationParameters) return false;

        return this.matchesCreationParameters(newCreationParameters);
    }

    private matchesCreationParameters(creationParameters: PasswordProtectionCreationParameters): boolean {
        return this.passwordType === creationParameters.passwordType && this.password === creationParameters.password;
    }
}
