import { IdentityDeletionProcessDTO } from "@nmshd/runtime-types";
import { IdentityDeletionProcess } from "@nmshd/transport";

export class IdentityDeletionProcessMapper {
    public static toIdentityDeletionProcessDTO(identityDeletionProcess: IdentityDeletionProcess): IdentityDeletionProcessDTO {
        return {
            id: identityDeletionProcess.id.toString(),
            createdAt: identityDeletionProcess.createdAt?.toString(),
            createdByDevice: identityDeletionProcess.createdByDevice?.toString(),
            gracePeriodEndsAt: identityDeletionProcess.gracePeriodEndsAt?.toString(),
            status: identityDeletionProcess.status,
            cancelledAt: identityDeletionProcess.cancelledAt?.toString(),
            cancelledByDevice: identityDeletionProcess.cancelledByDevice?.toString()
        };
    }

    public static toIdentityDeletionProcessDTOList(identityDeletionProcesses: IdentityDeletionProcess[]): IdentityDeletionProcessDTO[] {
        return identityDeletionProcesses.map((identityDeletionProcess) => this.toIdentityDeletionProcessDTO(identityDeletionProcess));
    }
}
