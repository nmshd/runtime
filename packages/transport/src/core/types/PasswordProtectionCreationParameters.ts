import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";
import { PasswordLocationIndicator, validatePasswordLocationIndicator } from "@nmshd/core-types";

export interface IPasswordProtectionCreationParameters extends ISerializable {
    passwordType: "pw" | `pin${number}`;
    password: string;
    passwordLocationIndicator?: PasswordLocationIndicator;
}

export class PasswordProtectionCreationParameters extends Serializable implements IPasswordProtectionCreationParameters {
    @validate({ regExp: /^(pw|pin(4|5|6|7|8|9|10|11|12|13|14|15|16))$/ })
    @serialize()
    public passwordType: "pw" | `pin${number}`;

    @validate({ min: 1 })
    @serialize()
    public password: string;

    @validate({ nullable: true, customValidator: validatePasswordLocationIndicator })
    @serialize({ any: true })
    public passwordLocationIndicator?: PasswordLocationIndicator;

    public static from(value: IPasswordProtectionCreationParameters): PasswordProtectionCreationParameters {
        return this.fromAny(value);
    }

    public static create(
        params: { password: string; passwordIsPin?: true; passwordLocationIndicator?: PasswordLocationIndicator } | undefined
    ): PasswordProtectionCreationParameters | undefined {
        if (!params) return;

        return PasswordProtectionCreationParameters.from({
            password: params.password,
            passwordType: params.passwordIsPin ? `pin${params.password.length}` : "pw",
            passwordLocationIndicator: params.passwordLocationIndicator
        });
    }
}
