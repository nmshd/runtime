import type { TransportServices } from "../../src";
import type { MockEventBus } from "./MockEventBus";

const eventBussesByTransportServices = new WeakMap<TransportServices, MockEventBus>();

export function registerEventBusForTransportServices(transportServices: TransportServices, eventBus: MockEventBus): void {
    eventBussesByTransportServices.set(transportServices, eventBus);
}

export function getEventBusForTransportServices(transportServices: TransportServices): MockEventBus | undefined {
    return eventBussesByTransportServices.get(transportServices);
}
