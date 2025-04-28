import { PasswordLocationIndicator, PasswordLocationIndicatorOptions } from "@nmshd/core-types";
import { PasswordProtection } from "@nmshd/transport";
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
        const passwordLocationIndicatorOptions = Object.values(PasswordLocationIndicatorOptions);

        if (value >= 0 && value < passwordLocationIndicatorOptions.length) {
            return PasswordLocationIndicatorOptions[value] as PasswordLocationIndicator;
        }

        return value as PasswordLocationIndicator;
    }
}
