import { AuditLog } from "../transmission/AuditLog";
import { RelationshipStatus } from "../transmission/RelationshipStatus";

export interface BackboneAcceptRelationshipsRequest {
    acceptanceContent: string;
}

export interface BackbonePutRelationshipsResponse {
    id: string;
    relationshipTemplateId: string;
    from: string;
    to: string;

    createdAt: string;
    status: RelationshipStatus;
    auditLog: AuditLog;
}
