import { IdentityDeletionProcessStatus } from "@nmshd/transport";
import { IdentityDeletionProcessAuditLogEntryDTO } from "./IdentityDeletionProcessAuditLogEntryDTO";

export interface IdentityDeletionProcessDTO {
    id: string;

    createdAt: string;
    createdByDevice?: string;

    // Approval period
    approvalReminder1SentAt?: string;
    approvalReminder2SentAt?: string;
    approvalReminder3SentAt?: string;

    // Approval
    approvedAt?: string;
    approvedByDevice?: string;
    gracePeriodEndsAt?: string;

    // Grace Period
    gracePeriodReminder1SentAt?: string;
    gracePeriodReminder2SentAt?: string;
    gracePeriodReminder3SentAt?: string;

    // Deletion
    deletionStartedAt?: string; // Completion
    completedAt?: string;
    completedByDevice?: string;

    // Cross Cutting
    status: IdentityDeletionProcessStatus;
    auditLog: IdentityDeletionProcessAuditLogEntryDTO[];
}
