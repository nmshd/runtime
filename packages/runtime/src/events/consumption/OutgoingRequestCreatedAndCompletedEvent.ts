import { LocalRequestDTO } from "../../types";
import { DataEvent } from "../DataEvent";

export class OutgoingRequestCreatedAndCompletedEvent extends DataEvent<LocalRequestDTO> {
    public static readonly namespace = "consumption.outgoingRequestCreatedAndCompleted";

    public constructor(eventTargetAddress: string, data: LocalRequestDTO) {
        super(OutgoingRequestCreatedAndCompletedEvent.namespace, eventTargetAddress, data);

        if (!data.isOwn) throw new Error("Cannot create this event for an incoming Request");
    }
}
