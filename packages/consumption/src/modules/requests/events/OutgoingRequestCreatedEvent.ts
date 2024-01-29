import { TransportDataEvent } from "@nmshd/transport";
import { ConsumptionError } from "../../../consumption/ConsumptionError";
import { LocalRequest } from "../local/LocalRequest";

export class OutgoingRequestCreatedEvent extends TransportDataEvent<LocalRequest> {
    public static readonly namespace = "consumption.outgoingRequestCreated";

    public constructor(eventTargetAddress: string, data: LocalRequest) {
        super(OutgoingRequestCreatedEvent.namespace, eventTargetAddress, data);

        if (!data.isOwn) throw new ConsumptionError("Cannot create this event for an incoming Request");
    }
}
