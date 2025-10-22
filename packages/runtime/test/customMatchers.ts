import { ApplicationError, EventConstructor, Result } from "@js-soft/ts-utils";
import { MockEventBus } from "./lib";

expect.extend({
    toBeSuccessful(actual: Result<unknown, ApplicationError>) {
        if (!(actual instanceof Result)) {
            return { pass: false, message: () => "expected an instance of Result." };
        }

        return {
            pass: actual.isSuccess,
            message: () => `expected a successful result; got an error result with the error message '${actual.error.message}'.`
        };
    },

    toBeAnError(actual: Result<unknown, ApplicationError>, expectedMessage: string | RegExp, expectedCode: string | RegExp) {
        if (!(actual instanceof Result)) {
            return {
                pass: false,
                message: () => "expected an instance of Result."
            };
        }

        if (!actual.isError) {
            return {
                pass: false,
                message: () => "expected an error result, but it was successful."
            };
        }

        if (actual.error.message.match(new RegExp(expectedMessage)) === null) {
            return {
                pass: false,
                message: () => `expected the error message of the result to match '${expectedMessage}', but received '${actual.error.message}'.`
            };
        }

        if (actual.error.code.match(new RegExp(expectedCode)) === null) {
            return {
                pass: false,
                message: () => `expected the error code of the result to match '${expectedCode}', but received '${actual.error.code}'.`
            };
        }

        return { pass: true, message: () => "" };
    },

    async toHavePublished<TEvent>(eventBus: unknown, eventConstructor: EventConstructor<TEvent>, eventConditions?: (event: TEvent) => boolean) {
        if (!(eventBus instanceof MockEventBus)) {
            throw new Error("This method can only be used with expect(MockEventBus).");
        }

        await eventBus.waitForRunningEventHandlers();
        const matchingEvents = eventBus.publishedEvents.filter((x) => x instanceof eventConstructor && (eventConditions?.(x) ?? true));
        if (matchingEvents.length > 0) {
            return {
                pass: true,
                message: () =>
                    `There were one or more events that matched the specified criteria, even though there should be none. The matching events are: ${JSON.stringify(
                        matchingEvents,
                        undefined,
                        2
                    )}`
            };
        }
        return { pass: false, message: () => `The expected event wasn't published. The published events are: ${JSON.stringify(eventBus.publishedEvents, undefined, 2)}` };
    }
});

declare global {
    namespace jest {
        interface Matchers<R> {
            toBeSuccessful(): R;
            toBeAnError(expectedMessage: string | RegExp, expectedCode: string | RegExp): R;
            toHavePublished<TEvent>(eventConstructor: EventConstructor<TEvent>, eventConditions?: (event: TEvent) => boolean): Promise<R>;
        }
    }
}
