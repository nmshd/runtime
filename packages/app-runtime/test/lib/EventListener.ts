import { Event, SubscriptionTarget } from "@js-soft/ts-utils";
import { LocalAccountSession } from "@nmshd/app-runtime";
import { DataEvent, Runtime } from "@nmshd/runtime";

export class EventWrapper {
    public namespace: string;
    public instance: Event;
}

export class EventListener {
    public constructor(
        public readonly runtime: Runtime,
        public readonly listeningTo: SubscriptionTarget<Event>[],
        public readonly session?: LocalAccountSession
    ) {}

    private receivedEvents: EventWrapper[] = [];
    private waitingForEvent: string;
    private promiseCallbacks: any;
    private subscriptions: Record<string, number> = {};

    public getReceivedEvents(): EventWrapper[] {
        return this.receivedEvents;
    }

    private eventHandler(namespace: string, eventInstance: Event) {
        if (this.session && eventInstance instanceof DataEvent) {
            if (eventInstance.eventTargetAddress !== this.session.address) {
                // Ignore event, it is not for our session
                return;
            }
        }
        this.receivedEvents.push({ namespace, instance: eventInstance });
        if (this.waitingForEvent && this.waitingForEvent === namespace) {
            if (this.promiseCallbacks) {
                this.promiseCallbacks.resolve();
            }
        }
    }

    public async waitFor(event: string | Function, concurrentOperation?: () => Promise<any>): Promise<any> {
        this.promiseCallbacks = undefined;
        this.waitingForEvent = typeof event === "function" ? event.name : event;
        const promise = new Promise((resolve, reject) => {
            this.promiseCallbacks = { resolve, reject };
        });

        const values = await Promise.all([promise, concurrentOperation?.()]);
        return values[0];
    }

    public start(): void {
        this.stop();
        this.receivedEvents = [];
        this.listeningTo.forEach((event) => {
            const namespace = typeof event === "function" ? event.name : event;
            const subscriptionId = this.runtime.eventBus.subscribe(event, (e: any) => {
                this.eventHandler(namespace, e);
            });
            this.subscriptions[namespace] = subscriptionId;
        });
    }

    public stop(): void {
        for (const namespace in this.subscriptions) {
            this.runtime.eventBus.unsubscribe(this.subscriptions[namespace]);
        }
        this.subscriptions = {};
    }
}
