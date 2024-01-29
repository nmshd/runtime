import { ErrorObject } from "ajv";
import { RuntimeErrors } from "../RuntimeErrors";
import { JsonSchema, JsonSchemaValidationResult } from "../SchemaRepository";
import { IValidator } from "./IValidator";
import { ValidationFailure } from "./ValidationFailure";
import { ValidationResult } from "./ValidationResult";

export class SchemaValidator<T> implements IValidator<T> {
    public constructor(protected readonly schema: JsonSchema) {}

    public validate(input: T): ValidationResult {
        const validationResult = this.schema.validate(input);

        return this.convertValidationResult(validationResult);
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
