import { RelationshipStatus } from "../transmission/RelationshipStatus";
import { BackboneGetRelationshipsChangesResponse } from "./BackboneGetRelationshipsChanges";

export interface BackboneGetRelationshipsRequest {
    ids: string[];
}

export interface BackboneGetRelationshipsResponse {
    id: string;
    relationshipTemplateId: string;
    from: string;
    to: string;
    changes: BackboneGetRelationshipsChangesResponse[];
    createdAt: string;
    status: RelationshipStatus;
}

export interface BackboneGetRelationshipsDateRange<T> {
    from?: T;
    to?: T;
}
