import { Event, EventBus, EventEmitter2EventBus, getEventNamespaceFromObject, SubscriptionTarget } from "@js-soft/ts-utils";

export class MockEventBus extends EventEmitter2EventBus {
    public publishedEvents: Event[] = [];
    private publishPromises: Promise<any>[] = [];
    private readonly publishPromisesWithName: { promise: Promise<any>; name: string }[] = [];

    public constructor() {
        super((_) => {
            // no-op
        });
    }

    public override publish(event: Event): void {
        this.publishedEvents.push(event);

        const namespace = getEventNamespaceFromObject(event);

        if (!namespace) {
            throw Error("The event needs a namespace. Use the EventNamespace-decorator in order to define a namespace for an event.");
        }

        const promise = this.emitter.emitAsync(namespace, event);

        this.publishPromises.push(promise);
        this.publishPromisesWithName.push({ promise: promise, name: namespace });
    }

    public async waitForEvent<TEvent extends Event>(
        subscriptionTarget: SubscriptionTarget<TEvent> & { namespace: string },
        predicate?: (event: TEvent) => boolean,
        timeout = 5000
    ): Promise<TEvent> {
        const alreadyTriggeredEvents = this.publishedEvents.find(
            (e) =>
                e.namespace === subscriptionTarget.namespace &&
                (typeof subscriptionTarget === "string" || e instanceof subscriptionTarget) &&
                (!predicate || predicate(e as TEvent))
        ) as TEvent | undefined;
        if (alreadyTriggeredEvents) {
            return alreadyTriggeredEvents;
        }

        const event = await waitForEvent(this, subscriptionTarget, predicate, timeout);
        return event;
    }

    public async waitForRunningEventHandlers(): Promise<void> {
        await Promise.all(this.publishPromises);
    }

    public reset(): void {
        this.publishedEvents = [];
        this.publishPromises = [];
    }
}

async function waitForEvent<TEvent>(
    eventBus: EventBus,
    subscriptionTarget: SubscriptionTarget<TEvent>,
    assertionFunction?: (t: TEvent) => boolean,
    timeout = 5000
): Promise<TEvent> {
    let subscriptionId: number;

    const eventPromise = new Promise<TEvent>((resolve) => {
        subscriptionId = eventBus.subscribe(subscriptionTarget, (event: TEvent) => {
            if (assertionFunction && !assertionFunction(event)) return;

            resolve(event);
        });
    });
    if (!timeout) return await eventPromise.finally(() => eventBus.unsubscribe(subscriptionId));

    let timeoutId: NodeJS.Timeout;
    const timeoutPromise = new Promise<TEvent>((_resolve, reject) => {
        timeoutId = setTimeout(
            () => reject(new Error(`timeout exceeded for waiting for event ${typeof subscriptionTarget === "string" ? subscriptionTarget : subscriptionTarget.name}`)),
            timeout
        );
    });

    return await Promise.race([eventPromise, timeoutPromise]).finally(() => {
        eventBus.unsubscribe(subscriptionId);
        clearTimeout(timeoutId);
    });
}
