import { Relationship } from "../modules/index.js";
import { TransportDataEvent } from "./TransportDataEvent.js";

export class RelationshipChangedEvent extends TransportDataEvent<Relationship> {
    public static readonly namespace = "transport.relationshipChanged";

    public constructor(eventTargetAddress: string, data: Relationship) {
        super(RelationshipChangedEvent.namespace, eventTargetAddress, data);
    }
}
