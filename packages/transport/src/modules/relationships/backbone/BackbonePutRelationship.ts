import { BackboneRelationshipAuditLog } from "../transmission/RelationshipAuditLog";
import { RelationshipStatus } from "../transmission/RelationshipStatus";

export interface BackboneAcceptRelationshipsRequest {
    content: string;
}

export interface BackbonePutRelationshipsResponse {
    id: string;
    relationshipTemplateId: string;
    from: string;
    to: string;

    createdAt: string;
    status: RelationshipStatus;
    auditLog: BackboneRelationshipAuditLog;
}
