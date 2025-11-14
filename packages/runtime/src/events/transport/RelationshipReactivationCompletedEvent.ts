import { RelationshipDTO } from "@nmshd/runtime-types";
import { DataEvent } from "../DataEvent.js";

export class RelationshipReactivationCompletedEvent extends DataEvent<RelationshipDTO> {
    public static readonly namespace = "transport.relationshipReactivationCompleted";

    public constructor(eventTargetAddress: string, data: RelationshipDTO) {
        super(RelationshipReactivationCompletedEvent.namespace, eventTargetAddress, data);
    }
}
