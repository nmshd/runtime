import { RuntimeErrors } from "../RuntimeErrors";
import { JsonSchema } from "../SchemaRepository";
import { SchemaValidator } from "./SchemaValidator";
import { ValidationFailure } from "./ValidationFailure";
import { ValidationResult } from "./ValidationResult";

export class GenericInputValidator<T extends object> extends SchemaValidator<T> {
    public constructor(protected override readonly schema: JsonSchema) {
        super(schema);
    }

    public override validate(input: T): ValidationResult {
        const validationResult = super.validate(input);

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
