import { ILoggerFactory } from "@js-soft/logging-abstractions";
import { Result } from "@js-soft/ts-utils";

/**
 * Create logger
 */
export interface INativeLoggerFactory extends ILoggerFactory {
    /**
     * Initialize logger
     */
    init(): Promise<Result<void>>;
}
