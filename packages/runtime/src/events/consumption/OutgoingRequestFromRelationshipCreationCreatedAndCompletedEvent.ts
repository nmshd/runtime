import { LocalRequestDTO } from "../../types";
import { DataEvent } from "../DataEvent";

export class OutgoingRequestFromRelationshipCreationCreatedAndCompletedEvent extends DataEvent<LocalRequestDTO> {
    public static readonly namespace = "consumption.outgoingRequestFromRelationshipCreationCreatedAndCompleted";

    public constructor(eventTargetAddress: string, data: LocalRequestDTO) {
        super(OutgoingRequestFromRelationshipCreationCreatedAndCompletedEvent.namespace, eventTargetAddress, data);

        if (!data.isOwn) throw new Error("Cannot create this event for an incoming Request");
    }
}
