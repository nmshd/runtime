import { CoreId } from "@nmshd/core-types";
import { TransportDataEvent } from "./TransportDataEvent.js";

export interface RelationshipDecomposedBySelfEventData {
    relationshipId: CoreId;
}

export class RelationshipDecomposedBySelfEvent extends TransportDataEvent<RelationshipDecomposedBySelfEventData> {
    public static readonly namespace = "transport.relationshipDecomposedBySelf";

    public constructor(eventTargetAddress: string, data: RelationshipDecomposedBySelfEventData) {
        super(RelationshipDecomposedBySelfEvent.namespace, eventTargetAddress, data);
    }
}
