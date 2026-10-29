import { Event, EventEmitter2EventBus, getEventNamespaceFromObject } from "@js-soft/ts-utils";

export class TestEventBus extends EventEmitter2EventBus {
    private readonly publishPromises: Promise<unknown>[] = [];

    public constructor() {
        super(() => {
            // ignore errors
        });
    }

    public override publish(event: Event): void {
        const namespace = getEventNamespaceFromObject(event);

        if (!namespace) {
            throw Error("The event needs a namespace. Use the EventNamespace-decorator in order to define a namespace for an event.");
        }

        this.publishPromises.push(this.emitter.emitAsync(namespace, event));
    }

    public async waitForRunningEventHandlers(): Promise<void> {
        while (this.publishPromises.length > 0) {
            const runningPromises = this.publishPromises.splice(0);
            await Promise.all(runningPromises);
        }
    }
}
