import { BackboneRelationshipStatus } from "./BackboneRelationshipStatus";

export interface BackboneRelationshipAuditLog extends Array<BackboneRelationshipAuditLogEntry> {}

export interface BackboneRelationshipAuditLogEntry {
    createdAt: string;
    createdBy: string;
    createdByDevice: string;
    reason: RelationshipAuditLogEntryReason;
    oldStatus?: BackboneRelationshipStatus;
    newStatus: BackboneRelationshipStatus;
}

export enum RelationshipAuditLogEntryReason {
    Creation = "Creation",
    AcceptanceOfCreation = "AcceptanceOfCreation",
    RejectionOfCreation = "RejectionOfCreation",
    RevocationOfCreation = "RevocationOfCreation",
    Termination = "Termination",
    ReactivationRequested = "ReactivationRequested",
    AcceptanceOfReactivation = "AcceptanceOfReactivation",
    RejectionOfReactivation = "RejectionOfReactivation",
    RevocationOfReactivation = "RevocationOfReactivation",
    Decomposition = "Decomposition"
}
