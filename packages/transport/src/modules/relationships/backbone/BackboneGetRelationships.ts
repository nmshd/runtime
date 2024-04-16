import { AuditLog } from "../transmission/AuditLog";
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
    creationContent: string;
    acceptanceContent: string;
    auditLog: AuditLog;
}

export interface BackboneGetRelationshipsDateRange<T> {
    from?: T;
    to?: T;
}
