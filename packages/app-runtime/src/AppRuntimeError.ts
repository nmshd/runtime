import { ILogger } from "@js-soft/logging-abstractions";
import { ApplicationError } from "@js-soft/ts-utils";

export class AppRuntimeError extends ApplicationError {
    public logWith(logger: ILogger): ApplicationError {
        logger.error(logger);
        return this;
    }
}
