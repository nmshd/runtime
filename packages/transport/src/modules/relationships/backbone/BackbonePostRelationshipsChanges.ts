import { RelationshipChangeType } from "../transmission/changes/RelationshipChangeType";

export interface BackbonePostRelationshipsRequest {
    relationshipTemplateId: string;
    content: any;
}

export interface BackbonePostRelationshipsChangesRequest {
    type: RelationshipChangeType;
}
