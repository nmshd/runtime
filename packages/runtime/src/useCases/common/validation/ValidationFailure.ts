import { ApplicationError } from "@js-soft/ts-utils";

export class ValidationFailure {
    public constructor(
        public readonly error: ApplicationError,
        public readonly propertyName?: string
    ) {}
}
