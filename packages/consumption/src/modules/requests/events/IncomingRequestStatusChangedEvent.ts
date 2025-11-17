import { TransportDataEvent } from "@nmshd/transport";
import { ConsumptionError } from "../../../consumption/ConsumptionError.js";
import { LocalRequest } from "../local/LocalRequest.js";
import { LocalRequestStatus } from "../local/LocalRequestStatus.js";

export interface IncomingRequestStatusChangedEventData {
    request: LocalRequest;
    oldStatus: LocalRequestStatus;
    newStatus: LocalRequestStatus;
}

export class IncomingRequestStatusChangedEvent extends TransportDataEvent<IncomingRequestStatusChangedEventData> {
    public static readonly namespace = "consumption.incomingRequestStatusChanged";

    public constructor(eventTargetAddress: string, data: IncomingRequestStatusChangedEventData) {
        super(IncomingRequestStatusChangedEvent.namespace, eventTargetAddress, data);

        if (data.request.isOwn) throw new ConsumptionError("Cannot create this event for an outgoing Request");
    }
}
