import { Relationship } from "../modules/relationships/local/Relationship";
import { TransportDataEvent } from "./TransportDataEvent";

export class RelationshipReactivationRequestedEvent extends TransportDataEvent<Relationship> {
    public static readonly namespace = "transport.relationshipReactivationRequested";

    public constructor(eventTargetAddress: string, data: Relationship) {
        super(RelationshipReactivationRequestedEvent.namespace, eventTargetAddress, data);
    }
}
