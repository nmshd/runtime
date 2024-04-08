import { RelationshipStatus } from "./RelationshipStatus";

export interface AuditLog extends Array<AuditLogEntry> {}

export interface AuditLogEntry {
    createdAt: string;
    createdBy: string;
    createdByDevice: string;
    reason: AuditLogEntryReason;
    oldStatus?: RelationshipStatus;
    newStatus: RelationshipStatus;
}

export enum AuditLogEntryReason {
    Creation = "Creation",
    AcceptanceOfCreation = "AcceptanceOfCreation",
    RejectionOfCreation = "RejectionofCreation",
    RevocationOfCreation = "RevocationOfCreation"
}
