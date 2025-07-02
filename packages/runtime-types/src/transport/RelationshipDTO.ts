import { ArbitraryRelationshipCreationContentJSON, RelationshipCreationContentJSON } from "@nmshd/content";
import { IdentityDTO } from "./IdentityDTO";

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
    ReactivationRequested = "ReactivationRequested",
    AcceptanceOfReactivation = "AcceptanceOfReactivation",
    RejectionOfReactivation = "RejectionOfReactivation",
    RevocationOfReactivation = "RevocationOfReactivation",
    Decomposition = "Decomposition",
    DecompositionDueToIdentityDeletion = "DecompositionDueToIdentityDeletion"
}

export interface RelationshipAuditLogEntryDTO {
    createdAt: string;
    createdBy: string;
    createdByDevice?: string;
    reason: RelationshipAuditLogEntryReason;
    oldStatus?: RelationshipStatus;
    newStatus: RelationshipStatus;
}

export interface RelationshipAuditLogDTO extends Array<RelationshipAuditLogEntryDTO> {}

export type RelationshipCreationContentDerivation = RelationshipCreationContentJSON | ArbitraryRelationshipCreationContentJSON;

export enum PeerDeletionStatus {
    ToBeDeleted = "ToBeDeleted",
    Deleted = "Deleted"
}

export interface PeerDeletionInfoDTO {
    deletionStatus: PeerDeletionStatus;
    deletionDate: string;
}

export interface RelationshipDTO {
    id: string;
    templateId: string;
    status: RelationshipStatus;
    peer: string;
    peerIdentity: IdentityDTO;
    peerDeletionInfo?: PeerDeletionInfoDTO;
    creationContent: RelationshipCreationContentDerivation;
    auditLog: RelationshipAuditLogDTO;
}
