import { ValidationResult } from "./ValidationResult";

export interface IValidator<T> {
    validate(value: T): Promise<ValidationResult> | ValidationResult;
}
