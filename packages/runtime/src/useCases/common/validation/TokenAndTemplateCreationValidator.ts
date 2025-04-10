import { CoreDate } from "@nmshd/core-types";
import { RuntimeErrors } from "../RuntimeErrors";
import { JsonSchema } from "../SchemaRepository";
import { SchemaValidator } from "./SchemaValidator";
import { ISO8601DateTimeString } from "./ValidatableStrings";
import { ValidationFailure } from "./ValidationFailure";
import { ValidationResult } from "./ValidationResult";

// TODO: should I add validatePasswordLocationIndicator here?

export class TokenAndTemplateCreationValidator<
    T extends {
        expiresAt?: ISO8601DateTimeString;
        passwordProtection?: {
            password: string;
            passwordIsPin?: true;
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
        }

        return validationResult;
    }
}
