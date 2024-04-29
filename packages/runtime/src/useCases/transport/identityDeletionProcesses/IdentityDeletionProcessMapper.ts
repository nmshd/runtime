import { IdentityDeletionProcess } from "@nmshd/transport";
import { IdentityDeletionProcessDTO } from "../../../types/transport/IdentityDeletionProcessDTO";

export class IdentityDeletionProcessMapper {
    public static toIdentityDeletionProcessDTO(identityDeletionProcess: IdentityDeletionProcess): IdentityDeletionProcessDTO {
        return {
            id: identityDeletionProcess.id.toString(),
            createdAt: identityDeletionProcess.createdAt?.toString(),
            createdByDevice: identityDeletionProcess.createdByDevice?.toString(),
            approvedAt: identityDeletionProcess.approvedAt?.toString(),
            approvedByDevice: identityDeletionProcess.approvedByDevice?.toString(),
            gracePeriodEndsAt: identityDeletionProcess.gracePeriodEndsAt?.toString(),
            status: identityDeletionProcess.status,
            cancelledAt: identityDeletionProcess.cancelledAt?.toString(),
            cancelledByDevice: identityDeletionProcess.cancelledByDevice?.toString(),
            rejectedAt: identityDeletionProcess.rejectedAt?.toString(),
            rejectedByDevice: identityDeletionProcess.rejectedByDevice?.toString()
        };
    }

    public static toIdentityDeletionProcessDTOList(identityDeletionProcesses: IdentityDeletionProcess[]): IdentityDeletionProcessDTO[] {
        return identityDeletionProcesses.map((identityDeletionProcess) => this.toIdentityDeletionProcessDTO(identityDeletionProcess));
    }
}
