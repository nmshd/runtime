import { DataEvent } from "../DataEvent.js";

export interface RelationshipDecomposedBySelfEventData {
    relationshipId: string;
}

export class RelationshipDecomposedBySelfEvent extends DataEvent<RelationshipDecomposedBySelfEventData> {
    public static readonly namespace = "transport.relationshipDecomposedBySelf";

    public constructor(eventTargetAddress: string, data: RelationshipDecomposedBySelfEventData) {
        super(RelationshipDecomposedBySelfEvent.namespace, eventTargetAddress, data);
    }
}
