import { ValidationFailure } from "./ValidationFailure";

export class ValidationResult {
    private readonly failures: ValidationFailure[] = [];

    public isValid(): boolean {
        return this.failures.length === 0;
    }

    public isInvalid(): boolean {
        return !this.isValid();
    }

    public addFailure(failure: ValidationFailure): void {
        this.failures.push(failure);
    }

    public addFailures(failures: ValidationFailure[]): void {
        this.failures.push(...failures);
    }

    public getFailures(): ValidationFailure[] {
        return this.failures.slice(0);
    }

    public getFailureMessages(): string[] {
        return this.failures.map((failure) => failure.error.message);
    }

    public getFailureCodes(): string[] {
        return this.failures.map((failure) => failure.error.code);
    }
}
