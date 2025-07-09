import { ValidationResult } from "./ValidationResult";

export function mergeResults(result1: ValidationResult, result2: ValidationResult): ValidationResult {
    if (result1.items.length !== result2.items.length) throw new Error("The dimensions of the ValidationResults do not match.");

    if (result1.items.length === 0) return result1.isError() ? result1 : result2;

    const mergedValidationResults = result1.items.map((item, index) => mergeResults(item, result2.items[index]));
    return ValidationResult.fromItems(mergedValidationResults);
}
