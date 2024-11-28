import { DateTime } from "luxon";
import { RuntimeErrors } from "../RuntimeErrors";
import { JsonSchema } from "../SchemaRepository";
import { SchemaValidator } from "./SchemaValidator";
import { ValidationFailure } from "./ValidationFailure";
import { ValidationResult } from "./ValidationResult";

export class TokenAndTemplateCreationValidator<T extends object> extends SchemaValidator<T> {
    public constructor(protected override readonly schema: JsonSchema) {
        super(schema);
    }

    public override validate(input: T): ValidationResult {
        const validationResult = super.validate(input);

        if ("expiresAt" in input && input.expiresAt) {
            if (DateTime.fromISO(input.expiresAt as string) <= DateTime.utc()) {
                validationResult.addFailure(new ValidationFailure(RuntimeErrors.general.invalidPropertyValue(`'expiresAt' must be in the future`), "expiresAt"));
            }
        }

        if ("passwordProtection" in input && input.passwordProtection) {
            const passwordProtection = input.passwordProtection as { password: string; passwordIsPin?: true };

            if (passwordProtection.passwordIsPin) {
                if (!/^[0-9]{4,16}$/.test(passwordProtection.password)) {
                    validationResult.addFailure(new ValidationFailure(RuntimeErrors.general.invalidPin()));
                }
            }
        }

        return validationResult;
    }
}
