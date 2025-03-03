import { Result } from "@js-soft/ts-utils";
import { AccountController, IdentityDeletionProcessController, IdentityDeletionProcessStatus } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { IdentityDeletionProcessDTO } from "../../../types/transport/IdentityDeletionProcessDTO";
import { RuntimeErrors, UseCase } from "../../common";
import { IdentityDeletionProcessMapper } from "./IdentityDeletionProcessMapper";

export class RejectIdentityDeletionProcessUseCase extends UseCase<void, IdentityDeletionProcessDTO> {
    public constructor(
        @Inject private readonly identityDeletionProcessController: IdentityDeletionProcessController,
        @Inject private readonly accountController: AccountController
    ) {
        super();
    }

    protected async executeInternal(): Promise<Result<IdentityDeletionProcessDTO>> {
        const identityDeletionProcess = await this.identityDeletionProcessController.getIdentityDeletionProcessByStatus(IdentityDeletionProcessStatus.WaitingForApproval);
        if (!identityDeletionProcess) return Result.fail(RuntimeErrors.identityDeletionProcess.noWaitingForApprovalIdentityDeletionProcess());

        const rejectedIdentityDeletionProcess = await this.identityDeletionProcessController.rejectIdentityDeletionProcess(identityDeletionProcess.id.toString());
        await this.accountController.syncDatawallet();
        return Result.ok(IdentityDeletionProcessMapper.toIdentityDeletionProcessDTO(rejectedIdentityDeletionProcess));
    }
}
