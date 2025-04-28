import { PasswordLocationIndicator, PasswordLocationIndicatorStrings, PasswordProtection } from "@nmshd/transport";

export function toPasswordProtection(
    passwordProtection?: PasswordProtection
): { password: string; passwordIsPin?: true; passwordLocationIndicator?: PasswordLocationIndicator } | undefined {
    if (!passwordProtection) {
        return undefined;
    }

    const passwordIsPin = passwordProtection.passwordType.startsWith("pin") ? true : undefined;
    const passwordLocationIndicator =
        passwordProtection.passwordLocationIndicator !== undefined ? mapNumberToPasswordLocationIndicatorString(passwordProtection.passwordLocationIndicator) : undefined;

    return {
        password: passwordProtection.password,
        passwordIsPin,
        passwordLocationIndicator
    };
}

function mapNumberToPasswordLocationIndicatorString(value: number): PasswordLocationIndicator {
    const passwordLocationIndicatorStringValues = Object.values(PasswordLocationIndicatorStrings);

    if (value >= 0 && value < passwordLocationIndicatorStringValues.length) {
        return PasswordLocationIndicatorStrings[value] as PasswordLocationIndicator;
    }

    return value as PasswordLocationIndicator;
}
