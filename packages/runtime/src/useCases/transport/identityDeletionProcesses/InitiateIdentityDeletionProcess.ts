import { Result } from "@js-soft/ts-utils";
import { AccountController, IdentityDeletionProcessController, IdentityDeletionProcessStatus } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { IdentityDeletionProcessDTO } from "../../../types/transport/IdentityDeletionProcessDTO";
import { RuntimeErrors, UseCase } from "../../common";
import { IdentityDeletionProcessMapper } from "./IdentityDeletionProcessMapper";

export class InitiateIdentityDeletionProcessUseCase extends UseCase<void, IdentityDeletionProcessDTO> {
    public constructor(
        @Inject private readonly identityDeletionProcessController: IdentityDeletionProcessController,
        @Inject private readonly accountController: AccountController
    ) {
        super();
    }

    protected async executeInternal(): Promise<Result<IdentityDeletionProcessDTO>> {
        const identityDeletionProcess = await this.identityDeletionProcessController.getIdentityDeletionProcessByStatus(
            IdentityDeletionProcessStatus.Approved,
            IdentityDeletionProcessStatus.WaitingForApproval
        );
        if (identityDeletionProcess) return Result.fail(RuntimeErrors.identityDeletionProcess.activeIdentityDeletionProcessAlreadyExists());

        const initiatedIdentityDeletionProcess = await this.identityDeletionProcessController.initiateIdentityDeletionProcess();
        await this.accountController.syncDatawallet();
        return Result.ok(IdentityDeletionProcessMapper.toIdentityDeletionProcessDTO(initiatedIdentityDeletionProcess));
    }
}
