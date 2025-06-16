import { Relationship } from "../modules";
import { TransportDataEvent } from "./TransportDataEvent";

export class RelationshipChangedEvent extends TransportDataEvent<Relationship> {
    public static readonly namespace = "transport.relationshipChanged";

    public constructor(eventTargetAddress: string, data: Relationship) {
        super(RelationshipChangedEvent.namespace, eventTargetAddress, data);
    }
}
