import { IdentityDTO } from "./IdentityDTO";
import { RelationshipChangeDTO } from "./RelationshipChangeDTO";
import { RelationshipTemplateDTO } from "./RelationshipTemplateDTO";

export enum RelationshipStatus {
    Pending = "Pending",
    Active = "Active",
    Rejected = "Rejected",
    Revoked = "Revoked",
    Terminated = "Terminated",
    DeletionProposed = "DeletionProposed"
}

export enum RelationshipAuditLogEntryReason {
    Creation = "Creation",
    AcceptanceOfCreation = "AcceptanceOfCreation",
    RejectionOfCreation = "RejectionOfCreation",
    RevocationOfCreation = "RevocationOfCreation",
    Termination = "Termination",
    Reactivation = "Reactivation",
    AcceptanceOfReactivation = "AcceptanceOfReactivation",
    RejectionOfReactivation = "RejectionOfReactivation",
    RevocationOfReactivation = "RevocationOfReactivation",
    Decomposition = "Decomposition"
}

export interface RelationshipAuditLogEntryDTO {
    createdAt: string;
    createdBy: string;
    createdByDevice: string;
    reason: RelationshipAuditLogEntryReason;
    oldStatus?: RelationshipStatus;
    newStatus: RelationshipStatus;
}

export interface RelationshipAuditLogDTO extends Array<RelationshipAuditLogEntryDTO> {}

export interface RelationshipDTO {
    id: string;
    template: RelationshipTemplateDTO;
    status: RelationshipStatus;
    peer: string;
    peerIdentity: IdentityDTO;
    changes: RelationshipChangeDTO[];
    creationContent: any;
    auditLog: RelationshipAuditLogDTO;
}
