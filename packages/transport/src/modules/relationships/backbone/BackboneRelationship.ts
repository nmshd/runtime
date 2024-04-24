import { BackboneRelationshipAuditLog } from "../transmission/RelationshipAuditLog";
import { RelationshipStatus } from "../transmission/RelationshipStatus";

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
