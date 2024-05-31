import { RelationshipDTO } from "../../types";
import { DataEvent } from "../DataEvent";

export class RelationshipReactivationCompletedEvent extends DataEvent<RelationshipDTO> {
    public static readonly namespace = "transport.relationshipReactivationCompleted";

    public constructor(eventTargetAddress: string, data: RelationshipDTO) {
        super(RelationshipReactivationCompletedEvent.namespace, eventTargetAddress, data);
    }
}
