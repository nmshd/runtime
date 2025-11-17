import { ILogger, ILoggerFactory } from "@js-soft/logging-abstractions";
import { TransportError } from "./TransportError.js";

export class TransportLoggerFactory {
    private static instance: ILoggerFactory;

    public static init(instance: ILoggerFactory): void {
        this.instance = instance;
    }

    public static getLogger(name: string | Function): ILogger {
        if (!this.isInitialized()) {
            throw new TransportError("The logger factory is not yet initialized. Call TransportLoggerFactory.init() first.");
        }

        if (typeof name === "function") {
            return this.instance.getLogger(`Transport.${name.name}`);
        }

        return this.instance.getLogger(`Transport.${name}`);
    }

    public static isInitialized(): boolean {
        return !!this.instance;
    }
}
