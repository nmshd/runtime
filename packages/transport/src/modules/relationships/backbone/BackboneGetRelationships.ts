import { BackboneRelationshipAuditLog } from "../transmission/RelationshipAuditLog";
import { RelationshipStatus } from "../transmission/RelationshipStatus";

export interface BackboneGetRelationshipsRequest {
    ids: string[];
}

export interface BackboneGetRelationshipsResponse {
    id: string;
    relationshipTemplateId: string;
    from: string;
    to: string;

    createdAt: string;
    status: RelationshipStatus;
    auditLog: BackboneRelationshipAuditLog;
    creationContent?: string;
    creationResponseContent?: string;
}

export interface BackboneGetRelationshipsDateRange<T> {
    from?: T;
    to?: T;
}
