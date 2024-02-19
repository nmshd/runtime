import { ValidationError } from "@js-soft/ts-serval";

export class ValidationErrorWithoutProperty extends ValidationError {
    public constructor(type: string, reason: string, cause?: Error) {
        super(type, "n/a", reason, cause);

        this.message = `${type} :: ${reason}`;
    }
}
