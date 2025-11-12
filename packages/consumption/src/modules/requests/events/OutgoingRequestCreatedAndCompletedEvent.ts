import { TransportDataEvent } from "@nmshd/transport";
import { ConsumptionError } from "../../../consumption/ConsumptionError.js";
import { LocalRequest } from "../local/LocalRequest.js";

export class OutgoingRequestCreatedAndCompletedEvent extends TransportDataEvent<LocalRequest> {
    public static readonly namespace = "consumption.outgoingRequestCreatedAndCompleted";

    public constructor(eventTargetAddress: string, data: LocalRequest) {
        super(OutgoingRequestCreatedAndCompletedEvent.namespace, eventTargetAddress, data);

        if (!data.isOwn) throw new ConsumptionError("Cannot create this event for an incoming Request");
    }
}
