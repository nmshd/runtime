import { ValidationResult } from "./ValidationResult.js";

export interface IValidator<T> {
    validate(value: T): Promise<ValidationResult> | ValidationResult;
}
