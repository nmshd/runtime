import { CoreId } from "../core";
import { TransportDataEvent } from "./TransportDataEvent";

export interface RelationshipDecomposedBySelfEventData {
    relationshipId: CoreId;
}

export class RelationshipDecomposedBySelfEvent extends TransportDataEvent<RelationshipDecomposedBySelfEventData> {
    public static readonly namespace = "transport.relationshipDecomposedBySelf";

    public constructor(eventTargetAddress: string, data: RelationshipDecomposedBySelfEventData) {
        super(RelationshipDecomposedBySelfEvent.namespace, eventTargetAddress, data);
    }
}
