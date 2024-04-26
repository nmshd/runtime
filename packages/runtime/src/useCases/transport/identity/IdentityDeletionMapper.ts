import { CoreDate, CoreId, IdentityDeletionProcess, IIdentityDeletionProcess } from "@nmshd/transport";
import { IdentityDeletionProcessDTO } from "../../../types/transport/IdentityDeletionProcessDTO";

export class IdentityDeletionMapper {
    public static toIdentityDeletionProcess(process: IdentityDeletionProcessDTO): IdentityDeletionProcess {
        return IdentityDeletionProcess.from({
            id: CoreId.from(process.id),
            createdAt: process.createdAt ? CoreDate.from(process.createdAt) : undefined,
            createdByDevice: process.createdByDevice ? CoreId.from(process.createdByDevice) : undefined,
            approvedAt: process.approvedAt ? CoreDate.from(process.approvedAt) : undefined,
            approvedByDevice: process.approvedByDevice ? CoreId.from(process.approvedByDevice) : undefined,
            gracePeriodEndsAt: process.gracePeriodEndsAt ? CoreDate.from(process.gracePeriodEndsAt) : undefined,
            cancelledAt: process.cancelledAt ? CoreDate.from(process.cancelledAt) : undefined,
            cancelledByDevice: process.cancelledByDevice ? CoreId.from(process.cancelledByDevice) : undefined,
            rejectedAt: process.rejectedAt ? CoreDate.from(process.rejectedAt) : undefined,
            rejectedByDevice: process.rejectedByDevice ? CoreId.from(process.rejectedByDevice) : undefined,
            status: process.status
        } as IIdentityDeletionProcess);
    }

    public static toIdentityDeletionProcessDTO(identityDeletion: IdentityDeletionProcess): IdentityDeletionProcessDTO {
        return {
            id: identityDeletion.id.toString(),
            createdAt: identityDeletion.createdAt?.toString(),
            createdByDevice: identityDeletion.createdByDevice?.toString(),
            approvedAt: identityDeletion.approvedAt?.toString(),
            approvedByDevice: identityDeletion.approvedByDevice?.toString(),
            gracePeriodEndsAt: identityDeletion.gracePeriodEndsAt?.toString(),
            status: identityDeletion.status,
            cancelledAt: identityDeletion.cancelledAt?.toString(),
            cancelledByDevice: identityDeletion.cancelledByDevice?.toString(),
            rejectedAt: identityDeletion.rejectedAt?.toString(),
            rejectedByDevice: identityDeletion.rejectedByDevice?.toString()
        };
    }
}
