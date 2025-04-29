import { PasswordLocationIndicator, PasswordLocationIndicatorOptions } from "@nmshd/core-types";
import { PasswordProtection, PasswordProtectionCreationParameters } from "@nmshd/transport";
import { PasswordProtectionDTO } from "../../types";

export class PasswordProtectionMapper {
    public static toPasswordProtectionDTO(passwordProtection?: PasswordProtection): PasswordProtectionDTO | undefined {
        if (!passwordProtection) return;

        return {
            password: passwordProtection.password,
            passwordIsPin: passwordProtection.passwordType.startsWith("pin") ? true : undefined,
            passwordLocationIndicator:
                passwordProtection.passwordLocationIndicator !== undefined
                    ? this.mapNumberToPasswordLocationIndicatorOption(passwordProtection.passwordLocationIndicator)
                    : undefined
        };
    }

    private static mapNumberToPasswordLocationIndicatorOption(value: number): PasswordLocationIndicator {
        const match = PasswordLocationIndicatorOptions[value];
        if (typeof match === "string") return match as PasswordLocationIndicator;

        return value as PasswordLocationIndicator;
    }

    public static toPasswordProtectionCreationParameters(params?: {
        password: string;
        passwordIsPin?: true;
        passwordLocationIndicator?: PasswordLocationIndicator;
    }): PasswordProtectionCreationParameters | undefined {
        if (!params) return;

        return PasswordProtectionCreationParameters.create({
            password: params.password,
            passwordIsPin: params.passwordIsPin,
            passwordLocationIndicator: this.mapPasswordLocationIndicatorOptionToNumber(params.passwordLocationIndicator)
        });
    }

    private static mapPasswordLocationIndicatorOptionToNumber(value?: PasswordLocationIndicator): number | undefined {
        if (typeof value === "undefined") return;
        if (typeof value === "number") return value;

        const numericValue = PasswordLocationIndicatorOptions[value];
        return numericValue;
    }

    public static mapPasswordLocationIndicatorFromQuery(input: string | string[]): number | number[] {
        if (Array.isArray(input)) return input.map((i) => this.mapSinglePasswordLocationIndicatorFromQuery(i));
        return this.mapSinglePasswordLocationIndicatorFromQuery(input);
    }

    private static mapSinglePasswordLocationIndicatorFromQuery(input: string): number {
        const stringIsNumeric = /^\d+$/.test(input);
        if (stringIsNumeric) return parseInt(input);

        const match = PasswordLocationIndicatorOptions[input as any] as any;
        if (typeof match === "number") return match;

        return -1;
    }
}
