import { CoreDate, CoreId, IdentityDeletionProcess } from "@nmshd/transport";
import { IdentityDeletionProcessDTO } from "../../../types/transport/IdentityDeletionProcessDTO";

export class IdentityDeletionMapper {
    public static toIdentityDeletionProcess(process: IdentityDeletionProcessDTO): IdentityDeletionProcess {
        return IdentityDeletionProcess.from({
            id: CoreId.from(process.id),
            createdAt: process.createdAt ? CoreDate.from(process.createdAt) : undefined,
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
            // TODO: yeet!!1
            deletionStartedAt: process.deletionStartedAt ? CoreDate.from(process.deletionStartedAt) : undefined,
            completedAt: process.completedAt ? CoreDate.from(process.completedAt) : undefined,
            completedByDevice: process.completedByDevice ? CoreId.from(process.completedByDevice) : undefined,
            cancelledAt: process.cancelledAt ? CoreDate.from(process.cancelledAt) : undefined,
            cancelledByDevice: process.cancelledByDevice ? CoreId.from(process.cancelledByDevice) : undefined,
            rejectedAt: process.rejectedAt ? CoreDate.from(process.rejectedAt) : undefined,
            rejectedByDevice: process.rejectedByDevice ? CoreId.from(process.rejectedByDevice) : undefined,
            status: process.status
        });
    }

    public static toIdentityDeletionProcessDTO(identityDeletion: IdentityDeletionProcess): IdentityDeletionProcessDTO {
        return {
            id: identityDeletion.id.toString(),
            createdAt: identityDeletion.createdAt?.toString(),
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
            cancelledAt: identityDeletion.cancelledAt?.toString(),
            cancelledByDevice: identityDeletion.cancelledByDevice?.toString(),
            rejectedAt: identityDeletion.rejectedAt?.toString(),
            rejectedByDevice: identityDeletion.rejectedByDevice?.toString()
        };
    }
}
