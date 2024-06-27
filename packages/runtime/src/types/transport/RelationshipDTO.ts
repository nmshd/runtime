import { ArbitraryRelationshipCreationContentJSON, RelationshipCreationContentContainingResponseJSON } from "@nmshd/content";
import { IdentityDTO } from "./IdentityDTO";
import { RelationshipTemplateDTO } from "./RelationshipTemplateDTO";

export enum RelationshipStatus {
    Pending = "Pending",
    Active = "Active",
    Rejected = "Rejected",
    Revoked = "Revoked",
    Terminated = "Terminated"
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
    RevocationOfReactivation = "RevocationOfReactivation"
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
    creationContent: RelationshipCreationContentContainingResponseJSON | ArbitraryRelationshipCreationContentJSON;
    auditLog: RelationshipAuditLogDTO;
}
