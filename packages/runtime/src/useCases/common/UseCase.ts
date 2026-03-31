import { ParsingError, ServalError, ValidationError } from "@js-soft/ts-serval";
import { ApplicationError, Result } from "@js-soft/ts-utils";
import { CoreError } from "@nmshd/core-types";
import { RequestError } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { Oauth2ClientErrorResponseError } from "@openid4vc/oauth2";
import stringifySafe from "json-stringify-safe";
import { AbstractCorrelator } from "./AbstractCorrelator";
import { PlatformErrorCodes } from "./PlatformErrorCodes";
import { RuntimeErrors } from "./RuntimeErrors";
import { IValidator } from "./validation/IValidator";
import { ValidationResult } from "./validation/ValidationResult";

export abstract class UseCase<IRequest, IResponse> {
    @Inject private readonly correlator?: AbstractCorrelator;

    public constructor(private readonly requestValidator?: IValidator<IRequest>) {}

    public async execute(request: IRequest): Promise<Result<IResponse>> {
        // if no correlator is defined in the DI a broken one without any methods is injected
        // we handle this exactly like no correlator is defined
        if (typeof this.correlator?.getId === "undefined") {
            return await this._executeCallback(request);
        }

        const correlationId = this.correlator.getId();
        if (correlationId) return await this.correlator.withId(correlationId, () => this._executeCallback(request));
        return await this.correlator.withId(() => this._executeCallback(request));
    }

    private async _executeCallback(request: IRequest) {
        if (this.requestValidator) {
            const validationResult = await this.requestValidator.validate(request);

            if (validationResult.isInvalid()) {
                return this.validationFailed(validationResult);
            }
        }

        try {
            return await this.executeInternal(request);
        } catch (e) {
            return this.failingResultFromUnknownError(e);
        }
    }

    private failingResultFromUnknownError(error: unknown): Result<any> {
        if (!(error instanceof Error)) {
            return Result.fail(RuntimeErrors.general.unknown(`An unknown object was thrown in a UseCase: ${stringifySafe(error)}`, error));
        }

        if (error instanceof RequestError) {
            return this.handleRequestError(error);
        }

        if (error instanceof ServalError) {
            return this.handleServalError(error);
        }

        if (error instanceof ApplicationError) {
            return Result.fail(error);
        }

        if (error instanceof CoreError) {
            return Result.fail(new ApplicationError(error.code, error.message));
        }

        if (error instanceof Oauth2ClientErrorResponseError) {
            return Result.fail(new ApplicationError(`error.runtime.openid4vc.oauth.${error.errorResponse.error}`, error.message));
        }

        return Result.fail(RuntimeErrors.general.unknown(`An error was thrown in a UseCase: ${error.message}`, error));
    }

    private handleServalError(error: ServalError) {
        let runtimeError;
        if (error instanceof ParsingError || error instanceof ValidationError) {
            runtimeError = RuntimeErrors.serval.requestDeserialization(error.message);
        } else if (error.message.match(/Type '.+' with version [0-9]+ was not found within reflection classes. You might have to install a module first./)) {
            runtimeError = RuntimeErrors.serval.unknownType(error.message);
        } else {
            runtimeError = RuntimeErrors.serval.general(error.message);
        }

        runtimeError.stack = error.stack;
        return Result.fail(runtimeError);
    }

    private handleRequestError(error: RequestError) {
        if (PlatformErrorCodes.isNotFoundError(error)) {
            return Result.fail(RuntimeErrors.general.recordNotFoundWithMessage(error.reason));
        }

        if (PlatformErrorCodes.isValidationError(error)) {
            return Result.fail(new ApplicationError(error.code, error.message));
        }

        if (PlatformErrorCodes.isUnexpectedError(error)) {
            return Result.fail(new ApplicationError(error.code, error.message));
        }

        return Result.fail(error);
    }

    protected abstract executeInternal(request: IRequest): Promise<Result<IResponse>> | Result<IResponse>;

    private validationFailed(validationResult: ValidationResult): any {
        const firstFailure = validationResult.getFailures()[0];
        return Result.fail(firstFailure.error);
    }
}
