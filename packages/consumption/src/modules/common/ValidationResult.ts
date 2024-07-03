import { ApplicationError } from "@js-soft/ts-utils";

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
        return items.some((r) => r.isError())
            ? ValidationResult.error(
                  new ApplicationError(
                      "error.consumption.validation.inheritedFromItem",
                      "Some child items have errors. If this error occurred during the creation of a request, call 'canCreate' to get more information."
                  ),
                  items
              )
            : ValidationResult.success(items);
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
