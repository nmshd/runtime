import { BackboneRelationshipAuditLog } from "../transmission/RelationshipAuditLog.js";
import { RelationshipStatus } from "../transmission/RelationshipStatus.js";

export interface BackboneRelationship {
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
