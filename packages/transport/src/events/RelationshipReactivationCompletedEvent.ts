import { Relationship } from "../modules/index.js";
import { TransportDataEvent } from "./TransportDataEvent.js";

export class RelationshipReactivationCompletedEvent extends TransportDataEvent<Relationship> {
    public static readonly namespace = "transport.relationshipReactivationCompleted";

    public constructor(eventTargetAddress: string, data: Relationship) {
        super(RelationshipReactivationCompletedEvent.namespace, eventTargetAddress, data);
    }
}
