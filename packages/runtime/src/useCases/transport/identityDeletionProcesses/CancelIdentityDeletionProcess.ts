import { Result } from "@js-soft/ts-utils";
import { IdentityDeletionProcessDTO } from "@nmshd/runtime-types";
import { AccountController, IdentityDeletionProcessController, IdentityDeletionProcessStatus } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { RuntimeErrors, UseCase } from "../../common";
import { IdentityDeletionProcessMapper } from "./IdentityDeletionProcessMapper";

export class CancelIdentityDeletionProcessUseCase extends UseCase<void, IdentityDeletionProcessDTO> {
    public constructor(
        @Inject private readonly identityDeletionProcessController: IdentityDeletionProcessController,
        @Inject private readonly accountController: AccountController
    ) {
        super();
    }

    protected async executeInternal(): Promise<Result<IdentityDeletionProcessDTO>> {
        const identityDeletionProcess = await this.identityDeletionProcessController.getIdentityDeletionProcessByStatus(IdentityDeletionProcessStatus.Approved);
        if (!identityDeletionProcess) return Result.fail(RuntimeErrors.identityDeletionProcess.noApprovedIdentityDeletionProcess());

        const cancelledIdentityDeletionProcess = await this.identityDeletionProcessController.cancelIdentityDeletionProcess(identityDeletionProcess.id.toString());
        await this.accountController.syncDatawallet();
        return Result.ok(IdentityDeletionProcessMapper.toIdentityDeletionProcessDTO(cancelledIdentityDeletionProcess));
    }
}
