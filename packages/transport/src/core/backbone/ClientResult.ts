import { ApplicationError } from "@js-soft/ts-utils";
import { CoreDate } from "@nmshd/core-types";
import { TransportError } from "../TransportError.js";
import { PlatformParameters } from "./PlatformParameters.js";

export class ClientResult<T> {
    private readonly _isSuccess: boolean;
    private readonly _error?: ApplicationError;
    private readonly _value?: T;

    public readonly requestTime?: CoreDate;
    public readonly responseDuration?: number;
    public readonly responseTime?: CoreDate;
    public readonly traceId?: string;
    public readonly correlationId?: string;
    public readonly etag?: string;
    public readonly responseStatus?: number;

    protected constructor(isSuccess: boolean, value?: T, error?: ApplicationError, platformParameters?: PlatformParameters) {
        if (isSuccess && error) {
            throw new TransportError("InvalidOperation: A result cannot be successful and contain an error");
        }
        if (!isSuccess && !error) {
            throw new TransportError("InvalidOperation: A failing result needs to contain an error");
        }

        if (value !== undefined && !isSuccess) {
            throw new TransportError("InvalidOperation: A value is only useful in case of a success.");
        }

        this._value = value;
        this._isSuccess = isSuccess;
        this._error = error;

        if (platformParameters) {
            this.requestTime = platformParameters.requestTime ? CoreDate.from(platformParameters.requestTime) : undefined;

            this.responseDuration = platformParameters.responseDuration ? parseInt(platformParameters.responseDuration) : undefined;

            this.responseTime = platformParameters.responseTime ? CoreDate.from(platformParameters.responseTime) : undefined;

            this.traceId = platformParameters.traceId;

            this.correlationId = platformParameters.correlationId;

            this.responseStatus = platformParameters.responseStatus;
            this.etag = platformParameters.etag;
        }
    }

    public get isSuccess(): boolean {
        return this._isSuccess;
    }

    public get isError(): boolean {
        return !this._isSuccess;
    }

    public get error(): ApplicationError {
        if (this._isSuccess) {
            throw new TransportError("Can't get the error of an succeeded result. Use 'value' instead.");
        }

        return this._error!;
    }

    public get value(): T {
        if (!this._isSuccess) throw this.error;

        return this._value!;
    }

    public static fail<T>(error: ApplicationError, platformParameters?: PlatformParameters): ClientResult<T> {
        return new ClientResult<T>(false, undefined, error, platformParameters);
    }

    public static ok<T>(value: T, platformParameters?: PlatformParameters): ClientResult<T> {
        return new ClientResult<T>(true, value, undefined, platformParameters);
    }
}
