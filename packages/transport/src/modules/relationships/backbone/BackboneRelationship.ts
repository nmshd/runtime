import { AuditLog } from "../transmission/AuditLog";
import { RelationshipStatus } from "../transmission/RelationshipStatus";

export interface BackboneRelationship {
    id: string;
    relationshipTemplateId: string;
    from: string;
    to: string;

    createdAt: string;
    status: RelationshipStatus;
    auditLog: AuditLog;
    creationContent: string;
    acceptanceContent?: string;
}
