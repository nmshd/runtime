import { ApplicationError } from "@js-soft/ts-utils";
import { AppRuntimeError } from "./AppRuntimeError";

export class UserfriendlyApplicationError extends AppRuntimeError {
    public constructor(
        code: string,
        message: string,
        public readonly userfriendlyMessage?: string,
        data?: any
    ) {
        super(code, message, data);
        if (!userfriendlyMessage) {
            this.userfriendlyMessage = `i18n://${code}`;
        }
    }

    public static fromError(error: ApplicationError, userfriendlyMessage?: string): UserfriendlyApplicationError {
        return new UserfriendlyApplicationError(error.code, error.message, userfriendlyMessage, error.data);
    }
}
