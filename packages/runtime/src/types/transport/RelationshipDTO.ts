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
export interface AuditLogEntryDTO {
    createdAt: string;
    createdBy: string;
    reason: AuditLogEntryReason;
    oldStatus?: RelationshipStatus;
    newStatus: RelationshipStatus;
}

export interface AuditLogDTO extends Array<AuditLogEntryDTO> {}

export interface RelationshipDTO {
    id: string;
    template: RelationshipTemplateDTO;
    status: RelationshipStatus;
    peer: string;
    peerIdentity: IdentityDTO;
    creationContent: any;
    auditLog?: AuditLogDTO;
}
