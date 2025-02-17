import { ValidationResult } from "./ValidationResult";

export function mergeResults(result1: ValidationResult, result2: ValidationResult): ValidationResult | Error {
    if (result1.items.length !== result2.items.length) {
        return new Error("The dimensions of the validation results do not match.");
    }

    if (result1.items.length === 0) {
        return result1.isError() ? result1 : result2;
    }

    const mergedValidationResults = new Array(result1.items.length) as ValidationResult[];
    for (let i = 0; i < result1.items.length; i++) {
        const mergedResult = mergeResults(result1.items[i], result2.items[i]);
        if (mergedResult instanceof Error) return mergedResult;

        mergedValidationResults[i] = mergedResult;
    }

    return ValidationResult.fromItems(mergedValidationResults);
}
