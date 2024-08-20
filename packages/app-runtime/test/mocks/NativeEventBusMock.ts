import { Event, EventBus, EventEmitter2EventBus, Result } from "@js-soft/ts-utils";
import { INativeEventBus } from "../../src";

export class NativeEventBusMock implements INativeEventBus {
    private eventBus: EventBus;

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

    public publish(event: Event): Result<void> {
        this.eventBus.publish(event);
        return Result.ok(undefined);
    }
}
