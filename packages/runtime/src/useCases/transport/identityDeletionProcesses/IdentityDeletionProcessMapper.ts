import { IdentityDeletionProcess } from "@nmshd/transport";
import { IdentityDeletionProcessDTO } from "../../../types/transport/IdentityDeletionProcessDTO";
import { RuntimeErrors } from "../../common";

export class IdentityDeletionProcessMapper {
    public static toIdentityDeletionProcessDTO(identityDeletionProcess: IdentityDeletionProcess): IdentityDeletionProcessDTO {
        if (!identityDeletionProcess.cache) {
            throw RuntimeErrors.general.cacheEmpty(IdentityDeletionProcess, identityDeletionProcess.id.toString());
        }

        return {
            id: identityDeletionProcess.id.toString(),
            createdAt: identityDeletionProcess.cache.createdAt?.toString(),
            createdByDevice: identityDeletionProcess.cache.createdByDevice?.toString(),
            approvalPeriodEndsAt: identityDeletionProcess.cache.approvalPeriodEndsAt?.toString(),
            rejectedAt: identityDeletionProcess.cache.rejectedAt?.toString(),
            rejectedByDevice: identityDeletionProcess.cache.rejectedByDevice?.toString(),
            approvedAt: identityDeletionProcess.cache.approvedAt?.toString(),
            approvedByDevice: identityDeletionProcess.cache.approvedByDevice?.toString(),
            gracePeriodEndsAt: identityDeletionProcess.cache.gracePeriodEndsAt?.toString(),
            status: identityDeletionProcess.cache.status,
            cancelledAt: identityDeletionProcess.cache.cancelledAt?.toString(),
            cancelledByDevice: identityDeletionProcess.cache.cancelledByDevice?.toString()
        };
    }

    public static toIdentityDeletionProcessDTOList(identityDeletionProcesses: IdentityDeletionProcess[]): IdentityDeletionProcessDTO[] {
        return identityDeletionProcesses.map((identityDeletionProcess) => this.toIdentityDeletionProcessDTO(identityDeletionProcess));
    }
}
