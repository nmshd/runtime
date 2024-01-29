import { ILogger } from "@js-soft/logging-abstractions";
import stringify from "json-stringify-safe";

export class CoreError extends Error {
    private readonly _code: string;
    public get code(): string {
        return this._code;
    }

    private readonly _reason: string;
    public get reason(): string {
        return this._reason;
    }

    private readonly _data: string;
    public get data(): string {
        return this._data;
    }

    // Intentionally using Date here instead of CoreDate - otherwise CoreError wouldn't be usable within CoreDate
    private readonly _time: Date;
    public get time(): Date {
        return this._time;
    }

    private readonly _rootError?: Error;
    public get rootError(): Error | undefined {
        return this._rootError;
    }

    private readonly _context?: Function;
    public get context(): Function | undefined {
        return this._context;
    }

    public constructor(code = "error.unknown", reason = "Operation failed unexpectedly.", data: any = null, time: Date = new Date(), rootError?: Error, context?: Function) {
        const message = [];
        message.push(code);
        if (reason) {
            message.push(": '", reason, "'");
        }

        message.push(" at ", time.toISOString());

        if (data) {
            if (typeof data["toJSON"] === "function") {
                message.push(` with data ${data.toJSON(false)}`);
            } else {
                message.push(` with data ${stringify(data)}`);
            }
        }
        super(message.join(""));
        this._code = code;
        this._reason = reason;
        this._time = time;
        this._data = data;
        this.name = "CoreError";
        this._rootError = rootError;
        this._context = context;

        if (typeof Error.captureStackTrace !== "undefined") {
            Error.captureStackTrace(this, context ?? CoreError);
        }
    }

    public equals(error: CoreError): boolean {
        return this.code === error.code;
    }

    public logWith(logger: ILogger): this {
        logger.error(this);
        return this;
    }
}
