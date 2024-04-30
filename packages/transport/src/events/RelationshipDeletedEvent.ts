import { CoreId } from "../core";
import { TransportDataEvent } from "./TransportDataEvent";

export class RelationshipDeletedEvent extends TransportDataEvent<CoreId> {
    public static readonly namespace = "transport.relationshipDeleted";

    public constructor(eventTargetAddress: string, relationshipId: CoreId) {
        super(RelationshipDeletedEvent.namespace, eventTargetAddress, relationshipId);
    }
}
