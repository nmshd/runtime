import { ApplicationError } from "@js-soft/ts-utils";
import { CoreDate } from "@nmshd/core-types";
import { AxiosError } from "axios";
import stringify from "json-stringify-safe";
import { PlatformError } from "./PlatformError";
import { PlatformParameters } from "./PlatformParameters";

export class RequestError extends ApplicationError {
    public platformError: PlatformError;

    public constructor(
        public readonly method: string,
        public readonly path: string,
        public readonly platformParameters?: PlatformParameters,
        code = "error.platform.unexpected",
        public readonly reason = "Platform operation failed unexpectedly.",
        public readonly requestId = "",
        public readonly status = 500,
        public readonly time: string = CoreDate.utc().toISOString(),
        public object?: any | undefined
    ) {
        super(code, "");

        let message = code;
        if (status) message += ` (${status})`;
        if (reason) message += `: '${reason}'`;
        message += ` for ${method} ${path}`;
        if (time) message += ` at ${time}`;
        if (platformParameters) message += ` with traceId '${platformParameters.traceId}'`;

        super.message = message;
    }

    public setObject(object: any): this {
        this.object = object;
        return this;
    }

    public override toString(): string {
        return `${this.name}\n${stringify(this.object)}\n${this.stack}`;
    }
    /**
     * Removes any unwanted information (data, Auth headers, credentials)
     * from the Axios data structure
     */
    public static cleanAxiosError(error: AxiosError): any {
        const errorCopy: any = error.toJSON();
        delete errorCopy.config.adapter;
        delete errorCopy.config.data;
        delete errorCopy.config.headers["Authorization"];
        delete errorCopy.config.httpAgentOptions;
        delete errorCopy.config.httpsAgentOptions;
        delete errorCopy.config.transformRequest;
        delete errorCopy.config.transformResponse;
        delete errorCopy.config.validateStatus;
        delete errorCopy.request;
        delete errorCopy.response;
        return errorCopy;
    }

    public static fromAxiosError(method: string, path: string, axiosError: AxiosError, requestId: string, platformParameters?: PlatformParameters): RequestError {
        try {
            if (!axiosError.isAxiosError) {
                const error = new RequestError(method, path, platformParameters, "error.transport.request.unknown", axiosError.message);

                error.stack = axiosError.stack;
                return error;
            }

            if (!axiosError.response) {
                let code = "error.transport.request.unknown";
                let status = 500;
                let reason = axiosError.message;
                switch (axiosError.code) {
                    case "ERR_FR_MAX_BODY_LENGTH_EXCEEDED":
                        code = "error.transport.request.bodyLengthExceeded";
                        status = 413;
                        break;
                    case "ECONNABORTED":
                        code = "error.transport.request.aborted";
                        break;
                    default:
                        if (axiosError.message === "Network Error") {
                            code = "error.transport.request.network";
                            reason = "It seems the platform was available but another network error happened. It could also be a CORS problem.";
                        } else if (axiosError.message.includes("ENOTFOUND")) {
                            code = "error.transport.request.addressNotFound";
                        }
                        break;
                }
                return new RequestError(method, path, platformParameters, code, reason, "", status).setObject(this.cleanAxiosError(axiosError));
            }

            if (axiosError.response.status === 401) {
                return new RequestError(method, path, platformParameters, "error.platform.unauthorized", "Unauthorized.", requestId, axiosError.response.status).setObject(
                    this.cleanAxiosError(axiosError)
                );
            }

            if (axiosError.response.status === 403) {
                return new RequestError(
                    method,
                    path,
                    platformParameters,
                    "error.platform.forbidden",
                    "You are not allowed to perform this action due to insufficient privileges.",
                    requestId,
                    axiosError.response.status
                ).setObject(this.cleanAxiosError(axiosError));
            }

            return new RequestError(
                method,
                path,
                platformParameters,
                "error.platform.unexpected",
                "Received invalid error content from platform. Contact the platform team.",
                requestId,
                axiosError.response.status
            ).setObject(this.cleanAxiosError(axiosError));
        } catch (e) {
            return new RequestError(method, path, platformParameters, "error.platform.unexpected", "An error occured while handling an axios error", requestId).setObject(e);
        }
    }
}
