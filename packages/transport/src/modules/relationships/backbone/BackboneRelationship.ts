import { BackboneRelationshipStatus } from "../transmission/BackboneRelationshipStatus";
import { BackboneRelationshipAuditLog } from "../transmission/RelationshipAuditLog";

export interface BackboneRelationship {
    id: string;
    relationshipTemplateId: string;
    from: string;
    to: string;

    createdAt: string;
    status: BackboneRelationshipStatus;
    auditLog: BackboneRelationshipAuditLog;
    creationContent?: string;
    creationResponseContent?: string;
}
