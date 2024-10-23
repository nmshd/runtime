/* eslint-disable jest/no-standalone-expect */
import { DataEvent, Event, EventBus, EventHandler, SubscriptionTarget } from "@js-soft/ts-utils";
import { TransportDataEvent } from "@nmshd/transport";

export class MockEventBus extends EventBus {
    private readonly _publishedEvents: { namespace: string; data?: any }[] = [];
    public get publishedEvents(): { namespace: string; data?: any }[] {
        return this._publishedEvents;
    }

    public clearPublishedEvents(): void {
        this._publishedEvents.splice(0);
    }

    public subscribe<TEvent = any>(_subscriptionTarget: SubscriptionTarget<TEvent>, _handler: EventHandler<TEvent>): number {
        // noop
        return 0;
    }

    public subscribeOnce<TEvent = any>(_subscriptionTarget: SubscriptionTarget<TEvent>, _handler: EventHandler<TEvent>): number {
        // noop
        return 0;
    }

    public unsubscribe(_subscriptionId: number): boolean {
        // noop
        return true;
    }

    public publish(event: Event): void {
        this._publishedEvents.push({
            namespace: event.namespace,
            data: event instanceof TransportDataEvent ? event.data : undefined
        });
    }

    public close(): void {
        // noop
    }

    public expectLastPublishedEvent<TEvent extends DataEvent<unknown>>(
        eventConstructor: (new (...args: any[]) => TEvent) & { namespace: string },
        data?: Partial<TEvent extends DataEvent<infer X> ? X : never>
    ): void {
        const lastEvent = this.publishedEvents[this.publishedEvents.length - 1];
        expect(lastEvent.namespace).toStrictEqual(eventConstructor.namespace);

        if (data) expect(lastEvent.data).toStrictEqual(expect.objectContaining(data));
    }

    public expectPublishedEvents(...eventContructors: ((new (...args: any[]) => DataEvent<unknown>) & { namespace: string })[]): void {
        const eventNamespaces = this.publishedEvents.map((e) => e.namespace);
        const constructorNamespaces = eventContructors.map((c) => c.namespace);
        expect(eventNamespaces).toStrictEqual(constructorNamespaces);
    }
}
