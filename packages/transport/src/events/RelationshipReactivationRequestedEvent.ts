import { Relationship } from "../modules/index.js";
import { TransportDataEvent } from "./TransportDataEvent.js";

export class RelationshipReactivationRequestedEvent extends TransportDataEvent<Relationship> {
    public static readonly namespace = "transport.relationshipReactivationRequested";

    public constructor(eventTargetAddress: string, data: Relationship) {
        super(RelationshipReactivationRequestedEvent.namespace, eventTargetAddress, data);
    }
}
