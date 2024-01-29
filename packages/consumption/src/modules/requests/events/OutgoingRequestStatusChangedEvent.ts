import { TransportDataEvent } from "@nmshd/transport";
import { ConsumptionError } from "../../../consumption/ConsumptionError";
import { LocalRequest } from "../local/LocalRequest";
import { LocalRequestStatus } from "../local/LocalRequestStatus";

export interface OutgoingRequestStatusChangedEventData {
    request: LocalRequest;
    oldStatus: LocalRequestStatus;
    newStatus: LocalRequestStatus;
}

export class OutgoingRequestStatusChangedEvent extends TransportDataEvent<OutgoingRequestStatusChangedEventData> {
    public static readonly namespace = "consumption.outgoingRequestStatusChanged";

    public constructor(eventTargetAddress: string, data: OutgoingRequestStatusChangedEventData) {
        super(OutgoingRequestStatusChangedEvent.namespace, eventTargetAddress, data);

        if (!data.request.isOwn) throw new ConsumptionError("Cannot create this event for an incoming Request");
    }
}
