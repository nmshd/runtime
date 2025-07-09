import { Relationship } from "../modules";
import { TransportDataEvent } from "./TransportDataEvent";

export class RelationshipReactivationRequestedEvent extends TransportDataEvent<Relationship> {
    public static readonly namespace = "transport.relationshipReactivationRequested";

    public constructor(eventTargetAddress: string, data: Relationship) {
        super(RelationshipReactivationRequestedEvent.namespace, eventTargetAddress, data);
    }
}
