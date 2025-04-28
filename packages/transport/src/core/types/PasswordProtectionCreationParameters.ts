import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";

type Enumerate<N extends number, Acc extends number[] = []> = Acc["length"] extends N ? Acc[number] : Enumerate<N, [...Acc, Acc["length"]]>;
type IntRange<From extends number, To extends number> = Exclude<Enumerate<To>, Enumerate<From>>;

export enum PasswordLocationIndicatorOptions {
    RecoveryKit = 0,
    Self = 1,
    Letter = 2,
    RegistrationLetter = 3,
    Email = 4,
    SMS = 5,
    App = 6,
    Website = 7
}

export type PasswordLocationIndicator = keyof typeof PasswordLocationIndicatorOptions | IntRange<50, 100>;

export interface IPasswordProtectionCreationParameters extends ISerializable {
    passwordType: "pw" | `pin${number}`;
    password: string;
    passwordLocationIndicator?: number;
}

export class PasswordProtectionCreationParameters extends Serializable implements IPasswordProtectionCreationParameters {
    @validate({ regExp: /^(pw|pin(4|5|6|7|8|9|10|11|12|13|14|15|16))$/ })
    @serialize()
    public passwordType: "pw" | `pin${number}`;

    @validate({ min: 1 })
    @serialize()
    public password: string;

    @validate({ nullable: true, min: 0, max: 99, customValidator: (v) => (!Number.isInteger(v) ? "This value must be an integer." : undefined) })
    @serialize({ any: true })
    public passwordLocationIndicator?: number;

    public static from(value: IPasswordProtectionCreationParameters): PasswordProtectionCreationParameters {
        return this.fromAny(value);
    }

    public static create(
        params: { password: string; passwordIsPin?: true; passwordLocationIndicator?: PasswordLocationIndicator } | undefined
    ): PasswordProtectionCreationParameters | undefined {
        if (!params) return;

        const passwordLocationIndicator =
            params.passwordLocationIndicator !== undefined ? this.mapPasswordLocationIndicatorOptionsToNumber(params.passwordLocationIndicator) : undefined;

        return PasswordProtectionCreationParameters.from({
            password: params.password,
            passwordType: params.passwordIsPin ? `pin${params.password.length}` : "pw",
            passwordLocationIndicator: passwordLocationIndicator
        });
    }

    private static mapPasswordLocationIndicatorOptionsToNumber(value: PasswordLocationIndicator): number {
        if (typeof value === "number") return value;

        const numericValue = PasswordLocationIndicatorOptions[value];
        return numericValue;
    }
}
