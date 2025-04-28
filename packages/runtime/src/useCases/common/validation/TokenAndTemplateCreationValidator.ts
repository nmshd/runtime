import { CoreDate } from "@nmshd/core-types";
import { PasswordLocationIndicatorOptions } from "@nmshd/transport";
import { RuntimeErrors } from "../RuntimeErrors";
import { JsonSchema } from "../SchemaRepository";
import { SchemaValidator } from "./SchemaValidator";
import { ISO8601DateTimeString } from "./ValidatableStrings";
import { ValidationFailure } from "./ValidationFailure";
import { ValidationResult } from "./ValidationResult";

export class TokenAndTemplateCreationValidator<
    T extends {
        expiresAt?: ISO8601DateTimeString;
        passwordProtection?: {
            password: string;
            passwordIsPin?: true;
            passwordLocationIndicator?: unknown;
        };
    }
> extends SchemaValidator<T> {
    public constructor(protected override readonly schema: JsonSchema) {
        super(schema);
    }

    public override validate(input: T): ValidationResult {
        const validationResult = super.validate(input);

        if (input.expiresAt && CoreDate.from(input.expiresAt).isExpired()) {
            validationResult.addFailure(new ValidationFailure(RuntimeErrors.general.invalidPropertyValue(`'expiresAt' must be in the future`), "expiresAt"));
        }

        if (input.passwordProtection) {
            const passwordProtection = input.passwordProtection;

            if (passwordProtection.passwordIsPin) {
                if (!/^[0-9]{4,16}$/.test(passwordProtection.password)) {
                    validationResult.addFailure(
                        new ValidationFailure(
                            RuntimeErrors.general.invalidPropertyValue(
                                `'passwordProtection.passwordIsPin' is true, hence 'passwordProtection.password' must consist of 4 to 16 digits from 0 to 9.`
                            ),
                            "passwordProtection"
                        )
                    );
                }
            }

            if (passwordProtection.passwordLocationIndicator && !TokenAndTemplateCreationValidator.isValidPasswordLocationIndicator(passwordProtection.passwordLocationIndicator)) {
                validationResult.addFailure(
                    new ValidationFailure(
                        RuntimeErrors.general.invalidPropertyValue(
                            `must be a number from 50 to 99 or one of the following strings: ${Object.values(PasswordLocationIndicatorOptions).slice(1).join(", ")}`
                        ),
                        "passwordLocationIndicator"
                    )
                );
            }
        }

        return validationResult;
    }

    private static isValidPasswordLocationIndicator(value: unknown): boolean {
        if (typeof value !== "string" && typeof value !== "number") return false;

        if (typeof value === "string") {
            const lowerCaseValue = value.toLowerCase();

            const lowerCaseKeys = Object.keys(PasswordLocationIndicatorOptions).map((key) => key.toLowerCase());
            const isPasswordLocationIndicatorOption = lowerCaseKeys.includes(lowerCaseValue);

            const isRecoveryKit = lowerCaseValue === "recoverykit";

            return isPasswordLocationIndicatorOption && !isRecoveryKit;
        }

        const isInValidRange = value >= 50 && value <= 99;
        return isInValidRange;
    }
}
