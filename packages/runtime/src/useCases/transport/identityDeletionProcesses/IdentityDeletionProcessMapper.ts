import { IdentityDeletionProcess } from "@nmshd/transport";
import { IdentityDeletionProcessDTO } from "../../../types/transport/IdentityDeletionProcessDTO";

export class IdentityDeletionProcessMapper {
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
