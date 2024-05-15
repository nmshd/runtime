import { RelationshipChangeStatus } from "../transmission/changes/RelationshipChangeStatus";
import { RelationshipChangeType } from "../transmission/changes/RelationshipChangeType";

export interface BackboneGetRelationshipsChangesRequest {
    ids: string[];
}
export interface BackboneGetRelationshipsChangesResponse {
    id: string;
    relationshipId: string;
    request: BackboneGetRelationshipsChangesSingleChangeResponse;
    response: BackboneGetRelationshipsChangesSingleChangeResponse | null;
    status: RelationshipChangeStatus;
    type: RelationshipChangeType;
}
export interface BackboneGetRelationshipsChangesSingleChangeResponse {
    createdBy: string;
    createdByDevice: string;
    createdAt: string;
    content: string | null;
}
export interface BackboneGetRelationshipsChangesDateRange<T> {
    from?: T;
    to?: T;
}
