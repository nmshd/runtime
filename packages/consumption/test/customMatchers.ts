import "vitest";
import { ErrorValidationResult, SuccessfulValidationResult, ValidationResult } from "../src";

expect.extend({
    successfulValidationResult(actual: ValidationResult) {
        return {
            pass: actual instanceof SuccessfulValidationResult,
            message: () =>
                `expected ${JSON.stringify(actual)} to be a ${SuccessfulValidationResult.name}, but it is an ${
                    ErrorValidationResult.name
                } with the error message ${(actual as ErrorValidationResult).error.message}`
        };
    },

    errorValidationResult(actual: ValidationResult, error?: { code?: string; message?: string | RegExp }) {
        if (actual instanceof SuccessfulValidationResult) {
            return {
                pass: false,
                message: () => `expected ${JSON.stringify(actual)} to be an ${ErrorValidationResult.name}, but it is a ${SuccessfulValidationResult.name}`
            };
        }

        if (!error || (!error.code && !error.message)) return { pass: true, message: () => "" };

        const errorValidationResult = actual as ErrorValidationResult;

        if (error.message && errorValidationResult.error.message.match(new RegExp(error.message)) === null) {
            return {
                pass: false,
                message: () => `expected the error message of the result to match '${error.message}', but received '${errorValidationResult.error.message}'.`
            };
        }

        if (error.code && errorValidationResult.error.code.match(new RegExp(error.code)) === null) {
            return {
                pass: false,
                message: () => `expected the error code of the result to match '${error.code}', but received '${errorValidationResult.error.code}'.`
            };
        }

        return { pass: true, message: () => "" };
    }
});

declare module "vitest" {
    // Vitest requires the received value type parameter, but these matchers do not use it.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface Matchers<R, T> {
        successfulValidationResult(): R;
        errorValidationResult(error?: { code?: string; message?: string | RegExp }): R;
    }
}
