import { TransportLoggerFactory } from "../TransportLoggerFactory.js";

/**
 * Measures the time needed to execute the given action and logs it using the given logger.
 * @param action The action whose time is to measured.
 * @param logger The logger the response time should be logged with. console will be used by default.
 * @param logMessageFormat The format of the log message. You can use the `$(time)` placeholder,
 *                         which will be replaced with the execution time in milliseconds.
 * @param warningThreshold
 * @returns
 */
export async function logExecutionTime<T>(
    action: () => Promise<T>,
    logMessageFormat = "Execution time: $(time)",
    warningThreshold = 200,
    logger: { info(message: string): void; warn(message: string): void } = console
): Promise<T> {
    const startTime = new Date().getTime();
    const result = await action();
    const endTime = new Date().getTime();
    const elapsedMilliseconds = endTime - startTime;

    const logMessage = logMessageFormat.replace("$(time)", elapsedMilliseconds.toString());

    if (elapsedMilliseconds > warningThreshold) {
        logger.warn(logMessage);
    } else {
        logger.info(logMessage);
    }

    return result;
}

/**
 * Method decorator which measures the time needed to execute the decorated method.
 * It retrieves a logger from `TransportLoggerFactory` for class owning the method.
 * If `TransportLoggerFactory` is not initialized, `console` is used instead.
 * @param logMessageFormat
 *   Format for the log message. Supports the following placeholders:
 *     $(method) (name of the called method as is)
 *     $(time) (the execution time)
 *     $(arg0) (the first argument of the called method)
 *     $(arg1) (the second argument of the called method)
 *     $(arg2) (the third argument of the called method)
 */
export function logExecutionTimeDecorator(logMessageFormat = "$(method)(...) - $(time)ms") {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor): void {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const logger = TransportLoggerFactory.isInitialized() ? TransportLoggerFactory.getLogger(target.constructor) : console;

            const newLogMessageFormat = logMessageFormat
                .replace("$(method)", propertyKey)
                .replace("$(arg0)", JSON.stringify(args[0]))
                .replace("$(arg1)", JSON.stringify(args[1]))
                .replace("$(arg2)", JSON.stringify(args[2]));

            return await logExecutionTime(() => originalMethod.apply(this, args), newLogMessageFormat, 200, logger);
        };
    };
}
