import { CoreDate, CoreId, IdentityDeletionProcess, IdentityDeletionProcessAuditLogEntry } from "@nmshd/transport";
import { IdentityDeletionProcessAuditLogEntryDTO } from "../../../types/transport/IdentityDeletionProcessAuditLogEntryDTO";
import { IdentityDeletionProcessDTO } from "../../../types/transport/IdentityDeletionProcessDTO";

export class IdentityDeletionMapper {
    static toIdentityDeletionProcess(process: IdentityDeletionProcessDTO): IdentityDeletionProcess {
        return IdentityDeletionProcess.from({
            id: CoreId.from(process.id),
            createdAt: CoreDate.from(process.createdAt),
            createdByDevice: process.createdByDevice ? CoreId.from(process.createdByDevice) : undefined,
            approvalReminder1SentAt: process.approvalReminder1SentAt ? CoreDate.from(process.approvalReminder1SentAt) : undefined,
            approvalReminder2SentAt: process.approvalReminder2SentAt ? CoreDate.from(process.approvalReminder2SentAt) : undefined,
            approvalReminder3SentAt: process.approvalReminder3SentAt ? CoreDate.from(process.approvalReminder3SentAt) : undefined,
            approvedAt: process.approvedAt ? CoreDate.from(process.approvedAt) : undefined,
            approvedByDevice: process.approvedByDevice ? CoreId.from(process.approvedByDevice) : undefined,
            gracePeriodEndsAt: process.gracePeriodEndsAt ? CoreDate.from(process.gracePeriodEndsAt) : undefined,
            gracePeriodReminder1SentAt: process.gracePeriodReminder1SentAt ? CoreDate.from(process.gracePeriodReminder1SentAt) : undefined,
            gracePeriodReminder2SentAt: process.gracePeriodReminder2SentAt ? CoreDate.from(process.gracePeriodReminder2SentAt) : undefined,
            gracePeriodReminder3SentAt: process.gracePeriodReminder3SentAt ? CoreDate.from(process.gracePeriodReminder3SentAt) : undefined,
            deletionStartedAt: process.deletionStartedAt ? CoreDate.from(process.deletionStartedAt) : undefined,
            completedAt: process.completedAt ? CoreDate.from(process.completedAt) : undefined,
            completedByDevice: process.completedByDevice ? CoreId.from(process.completedByDevice) : undefined,
            status: process.status,
            auditLog: process.auditLog.map((log) => IdentityDeletionMapper.toIdentityDeletionProcessAuditLogEntry(log))
        });
    }
    static toIdentityDeletionProcessAuditLogEntry(log: IdentityDeletionProcessAuditLogEntryDTO): IdentityDeletionProcessAuditLogEntry {
        return IdentityDeletionProcessAuditLogEntry.from({
            id: CoreId.from(log.id),
            processId: CoreId.from(log.processId),
            message: log.message,
            createdAt: CoreDate.from(log.createdAt),
            identityAddressHash: log.identityAddressHash,
            deviceIdHash: log.deviceIdHash,
            oldStatus: log.oldStatus,
            newStatus: log.newStatus
        });
    }

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
