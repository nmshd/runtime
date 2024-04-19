import { IdentityDeletionProcess, IdentityDeletionProcessAuditLogEntry } from "@nmshd/transport";
import { IdentityDeletionProcessAuditLogEntryDTO } from "../../../types/transport/IdentityDeletionProcessAuditLogEntryDTO";
import { IdentityDeletionProcessDTO } from "../../../types/transport/IdentityDeletionProcessDTO";

export class IdentityDeletionMapper {
    public static toIdentityDeletionProcessDTO(identityDeletion: IdentityDeletionProcess): IdentityDeletionProcessDTO {
        return {
            id: identityDeletion.id.toString(),
            createdAt: identityDeletion.createdAt.toString(),
            createdByDevice: identityDeletion.createdByDevice?.toString(),
            approvalReminder1SentAt: identityDeletion.approvalReminder1SentAt?.toString(),
            approvalReminder2SentAt: identityDeletion.approvalReminder2SentAt?.toString(),
            approvalReminder3SentAt: identityDeletion.approvalReminder3SentAt?.toString(),
            approvedAt: identityDeletion.approvedAt?.toString(),
            approvedByDevice: identityDeletion.approvedByDevice?.toString(),
            gracePeriodEndsAt: identityDeletion.gracePeriodEndsAt?.toString(),
            gracePeriodReminder1SentAt: identityDeletion.gracePeriodReminder1SentAt?.toString(),
            gracePeriodReminder2SentAt: identityDeletion.gracePeriodReminder2SentAt?.toString(),
            gracePeriodReminder3SentAt: identityDeletion.gracePeriodReminder3SentAt?.toString(),
            deletionStartedAt: identityDeletion.deletionStartedAt?.toString(),
            completedAt: identityDeletion.completedAt?.toString(),
            completedByDevice: identityDeletion.completedByDevice?.toString(),
            status: identityDeletion.status,
            auditLog: identityDeletion.auditLog.map((log) => IdentityDeletionMapper.toIdentityDeletionProcessAuditLogEntryDTO(log))
        };
    }
    public static toIdentityDeletionProcessAuditLogEntryDTO(auditLogEntry: IdentityDeletionProcessAuditLogEntry): IdentityDeletionProcessAuditLogEntryDTO {
        return {
            id: auditLogEntry.id.toString(),
            processId: auditLogEntry.processId.toString(),
            createdAt: auditLogEntry.createdAt.toString(),
            message: auditLogEntry.message.toString(),
            identityAddressHash: auditLogEntry.identityAddressHash.toString(),
            deviceIdHash: auditLogEntry.deviceIdHash?.toString(),
            oldStatus: auditLogEntry.oldStatus,
            newStatus: auditLogEntry.newStatus
        };
    }
}
