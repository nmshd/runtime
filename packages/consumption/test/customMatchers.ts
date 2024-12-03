import { SerializableBase } from "@js-soft/ts-serval";
import { set } from "lodash";
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
    },

    toStrictEqualExcluding(received: unknown, expected: unknown, ...excludes: string[]) {
        if (received instanceof SerializableBase) {
            received = received.toJSON();
        }
        if (expected instanceof SerializableBase) {
            expected = expected.toJSON();
        }

        const receivedClone = JSON.parse(JSON.stringify(received));
        const expectedClone = JSON.parse(JSON.stringify(expected));

        excludes.forEach((exclud) => {
            set(receivedClone, exclud, undefined);
            set(expectedClone, exclud, undefined);
        });

        const matcherName = "toStrictEqual";
        const options = {
            comment: "deep equality",
            isNot: this.isNot,
            promise: this.promise
        };

        const pass = this.equals(receivedClone, expectedClone, undefined, true);

        let message: string;
        if (pass) {
            message =
                `${this.utils.matcherHint(matcherName, undefined, undefined, options)}\n\n` +
                `Expected: not ${this.utils.printExpected(expectedClone)}\n${
                    this.utils.stringify(expectedClone) === this.utils.stringify(receivedClone) ? "" : `Received:     ${this.utils.printReceived(receivedClone)}`
                }`;
        } else {
            message = `${this.utils.matcherHint(matcherName, undefined, undefined, options)}\n\n${this.utils.printDiffOrStringify(
                expectedClone,
                receivedClone,
                "Expected",
                "Received",
                this.expand ?? true
            )}`;
        }

        return { message: () => message, pass };
    }
});

declare global {
    namespace jest {
        interface Matchers<R> {
            successfulValidationResult(): R;
            errorValidationResult(error?: { code?: string; message?: string | RegExp }): R;
            toStrictEqualExcluding(expected: unknown, ...ignoreProperties: string[]): R;
        }
    }
}
