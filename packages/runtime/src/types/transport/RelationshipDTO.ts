import { IdentityDTO } from "./IdentityDTO";
import { RelationshipTemplateDTO } from "./RelationshipTemplateDTO";

export enum RelationshipStatus {
    Pending = "Pending",
    Active = "Active",
    Rejected = "Rejected",
    Revoked = "Revoked",
    Terminating = "Terminating",
    Terminated = "Terminated"
}

export enum AuditLogEntryReason {
    Creation = "Creation",
    AcceptanceOfCreation = "AcceptanceOfCreation",
    RejectionOfCreation = "RejectionofCreation",
    RevocationOfCreation = "RevocationOfCreation"
}
export interface AuditLogEntry {
    createdAt: string;
    createdBy: string;
    reason: AuditLogEntryReason;
    oldStatus?: RelationshipStatus;
    newStatus: RelationshipStatus;
}

export interface AuditLog extends Array<AuditLogEntry> {}

export interface RelationshipDTO {
    id: string;
    template: RelationshipTemplateDTO;
    status: RelationshipStatus;
    peer: string;
    peerIdentity: IdentityDTO;
    creationContent: any;
    auditLog?: AuditLog;
}
