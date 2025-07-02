import { RelationshipDTO } from "@nmshd/runtime-types";
import { DataEvent } from "../DataEvent";

export class RelationshipReactivationRequestedEvent extends DataEvent<RelationshipDTO> {
    public static readonly namespace = "transport.relationshipReactivationRequested";

    public constructor(eventTargetAddress: string, data: RelationshipDTO) {
        super(RelationshipReactivationRequestedEvent.namespace, eventTargetAddress, data);
    }
}
