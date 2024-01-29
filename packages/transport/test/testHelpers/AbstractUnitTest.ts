import { ILogger, ILoggerFactory } from "@js-soft/logging-abstractions";

export abstract class AbstractUnitTest {
    protected logger: ILogger;

    public constructor(protected loggerFactory: ILoggerFactory) {
        this.logger = this.loggerFactory.getLogger(this.constructor.name);
    }

    public abstract run(): void;
}
