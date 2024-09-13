import { ApplicationError } from "@js-soft/ts-utils";
import { ConsumptionCoreErrors } from "../../consumption/ConsumptionCoreErrors";

export abstract class ValidationResult {
    protected constructor(public readonly items: ValidationResult[]) {}

    public isSuccess(): this is SuccessfulValidationResult {
        return this instanceof SuccessfulValidationResult;
    }

    public isError(): this is ErrorValidationResult {
        return this instanceof ErrorValidationResult;
    }

    public static success(items: ValidationResult[] = []): SuccessfulValidationResult {
        return new SuccessfulValidationResult(items);
    }

    public static error(error: ApplicationError, items: ValidationResult[] = []): ErrorValidationResult {
        return new ErrorValidationResult(error, items);
    }

    public static fromItems(items: ValidationResult[]): ValidationResult {
        if (items.some((r) => r.isError())) {
            const receivedError = items.find((r) => r.isError());
            if (typeof receivedError?.error.code !== "undefined") {
                return ValidationResult.error(ConsumptionCoreErrors.requests.inheritedFromItem("Some child items have errors."), items);
            }
            return ValidationResult.error(
                ConsumptionCoreErrors.requests.inheritedFromItem(
                    "Some child items have errors. If this error occurred during the specification of a Request, call 'canCreate' to get more information."
                ),
                items
            );
        }
        return ValidationResult.success(items);
    }
}

export class SuccessfulValidationResult extends ValidationResult {
    public constructor(items: ValidationResult[]) {
        super(items);
    }
}

export class ErrorValidationResult extends ValidationResult {
    public constructor(
        public readonly error: ApplicationError,
        items: ValidationResult[]
    ) {
        super(items);
    }
}
