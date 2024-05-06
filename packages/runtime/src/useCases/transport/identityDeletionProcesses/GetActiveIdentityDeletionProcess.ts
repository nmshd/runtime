import { Result } from "@js-soft/ts-utils";
import { IdentityDeletionProcessController, IdentityDeletionProcessStatus } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { IdentityDeletionProcessDTO } from "../../../types/transport/IdentityDeletionProcessDTO";
import { RuntimeErrors, UseCase } from "../../common";
import { IdentityDeletionProcessMapper } from "./IdentityDeletionProcessMapper";

export class GetActiveIdentityDeletionProcessUseCase extends UseCase<void, IdentityDeletionProcessDTO> {
    public constructor(@Inject private readonly identityDeletionProcessController: IdentityDeletionProcessController) {
        super();
    }

    protected async executeInternal(): Promise<Result<IdentityDeletionProcessDTO>> {
        const activeIdentityDeletionProcess = await this.identityDeletionProcessController.getIdentityDeletionProcessByStatus([
            IdentityDeletionProcessStatus.Approved,
            IdentityDeletionProcessStatus.WaitingForApproval
        ]);
        if (typeof activeIdentityDeletionProcess === "undefined") {
            return Result.fail(RuntimeErrors.identity.noActiveIdentityDeletionProcess());
        }

        return Result.ok(IdentityDeletionProcessMapper.toIdentityDeletionProcessDTO(activeIdentityDeletionProcess));
    }
}
