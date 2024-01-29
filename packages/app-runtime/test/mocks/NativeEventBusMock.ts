import { AppReadyEvent, INativeEventBus } from "@js-soft/native-abstractions";
import { Event, EventBus, EventEmitter2EventBus, Result } from "@js-soft/ts-utils";

export class NativeEventBusMock implements INativeEventBus {
    private eventBus: EventBus;
    private locked = true;
    private queue: Event[] = [];

    public get isLocked(): boolean {
        return this.locked;
    }

    public init(): Promise<Result<void>> {
        this.eventBus = new EventEmitter2EventBus(() => {
            // noop
        });
        return Promise.resolve(Result.ok(undefined));
    }

    public subscribe(event: Event, handler: (event: any) => void): Result<number> {
        const id = this.eventBus.subscribe(event.namespace, handler);
        return Result.ok(id);
    }

    public subscribeOnce(event: Event, handler: (event: any) => void): Result<number> {
        const id = this.eventBus.subscribeOnce(event.namespace, handler);
        return Result.ok(id);
    }

    public unsubscribe(id: number): Result<void> {
        this.eventBus.unsubscribe(id);
        return Result.ok(undefined);
    }

    /**
     * Publish Events on the EventBus.
     * The EventBus is initially locked.
     * Published events are queued to be published after the EventBus is unlocked.
     * To unlock the EventBus an AppReadyEvent has to be published.
     * @param event
     * @returns
     */
    public publish(event: Event): Result<void> {
        if (this.locked) {
            if (event instanceof AppReadyEvent) {
                this.locked = false;
                // eslint-disable-next-line no-console
                console.log("Unlocked EventBus."); // No js-soft logger available at this stage
                this.queue.forEach((event: Event) => this.publish(event));
                this.queue = [];
                // eslint-disable-next-line no-console
                console.log("All queued events have been published."); // No js-soft logger available at this stage
            } else {
                this.queue.push(event);
                // eslint-disable-next-line no-console
                console.warn("EventBus is locked. Queued the following event:", event); // No js-soft logger available at this stage
            }
            return Result.ok(undefined);
        }
        this.eventBus.publish(event);
        return Result.ok(undefined);
    }
}
