import { CoreId } from "../core";
import { TransportDataEvent } from "./TransportDataEvent";

export class RelationshipDeletedBySelfEvent extends TransportDataEvent<CoreId> {
    public static readonly namespace = "transport.relationshipDeletedBySelf";

    public constructor(eventTargetAddress: string, relationshipId: CoreId) {
        super(RelationshipDeletedBySelfEvent.namespace, eventTargetAddress, relationshipId);
    }
}
