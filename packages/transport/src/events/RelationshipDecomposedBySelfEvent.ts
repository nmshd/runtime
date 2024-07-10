import { CoreId } from "../core";
import { TransportDataEvent } from "./TransportDataEvent";

export class RelationshipDecomposedBySelfEvent extends TransportDataEvent<CoreId> {
    public static readonly namespace = "transport.relationshipDecomposedBySelf";

    public constructor(eventTargetAddress: string, relationshipId: CoreId) {
        super(RelationshipDecomposedBySelfEvent.namespace, eventTargetAddress, relationshipId);
    }
}
