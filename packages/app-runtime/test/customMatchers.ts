import { EventConstructor } from "@js-soft/ts-utils";
import { MockEventBus } from "./lib";

expect.extend({
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
            toHavePublished<TEvent>(eventConstructor: EventConstructor<TEvent>, eventConditions?: (event: TEvent) => boolean): Promise<R>;
        }
    }
}
