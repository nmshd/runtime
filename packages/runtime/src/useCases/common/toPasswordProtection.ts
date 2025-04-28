import { PasswordLocationIndicator, PasswordLocationIndicatorOptions } from "@nmshd/core-types";
import { PasswordProtection } from "@nmshd/transport";

export function toPasswordProtection(
    passwordProtection?: PasswordProtection
): { password: string; passwordIsPin?: true; passwordLocationIndicator?: PasswordLocationIndicator } | undefined {
    if (!passwordProtection) {
        return undefined;
    }

    const passwordIsPin = passwordProtection.passwordType.startsWith("pin") ? true : undefined;
    const passwordLocationIndicator =
        passwordProtection.passwordLocationIndicator !== undefined ? mapNumberToPasswordLocationIndicatorOption(passwordProtection.passwordLocationIndicator) : undefined;

    return {
        password: passwordProtection.password,
        passwordIsPin,
        passwordLocationIndicator
    };
}

function mapNumberToPasswordLocationIndicatorOption(value: number): PasswordLocationIndicator {
    const passwordLocationIndicatorOptions = Object.values(PasswordLocationIndicatorOptions);

    if (value >= 0 && value < passwordLocationIndicatorOptions.length) {
        return PasswordLocationIndicatorOptions[value] as PasswordLocationIndicator;
    }

    return value as PasswordLocationIndicator;
}
