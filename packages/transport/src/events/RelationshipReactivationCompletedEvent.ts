import { Relationship } from "../modules";
import { TransportDataEvent } from "./TransportDataEvent";

export class RelationshipReactivationCompletedEvent extends TransportDataEvent<Relationship> {
    public static readonly namespace = "transport.relationshipReactivationCompleted";

    public constructor(eventTargetAddress: string, data: Relationship) {
        super(RelationshipReactivationCompletedEvent.namespace, eventTargetAddress, data);
    }
}
