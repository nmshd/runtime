import { ErrorObject } from "ajv";
import { DateTime } from "luxon";
import { RuntimeErrors } from "../RuntimeErrors";
import { JsonSchema, JsonSchemaValidationResult } from "../SchemaRepository";
import { IValidator } from "./IValidator";
import { ValidationFailure } from "./ValidationFailure";
import { ValidationResult } from "./ValidationResult";

export class SchemaValidator<T extends object> implements IValidator<T> {
    public constructor(protected readonly schema: JsonSchema) {}

    public validate(input: T): ValidationResult {
        const validationResult = this.convertValidationResult(this.schema.validate(input));

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

    protected convertValidationResult(validationResult: JsonSchemaValidationResult): ValidationResult {
        const result = new ValidationResult();

        if (validationResult.isValid) {
            return result;
        }

        result.addFailures(validationResult.errors!.map(this.schemaErrorToValidationFailure));

        return result;
    }

    private schemaErrorToValidationFailure(err: ErrorObject): ValidationFailure {
        const errorMessage = `${err.instancePath} ${err.message}`.replace(/^\//, "").replace(/"/g, "").trim();
        return new ValidationFailure(RuntimeErrors.general.invalidPropertyValue(errorMessage), err.instancePath);
    }
}
