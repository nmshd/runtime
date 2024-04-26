import { Result } from "@js-soft/ts-utils";
import { AccountController, IdentityDeletionProcessController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { IdentityDeletionProcessDTO } from "../../../types/transport/IdentityDeletionProcessDTO";
import { RuntimeErrors, UseCase } from "../../common";
import { IdentityDeletionProcessMapper } from "./IdentityDeletionProcessMapper";

export class ApproveIdentityDeletionProcessUseCase extends UseCase<void, IdentityDeletionProcessDTO> {
    public constructor(
        @Inject private readonly identityDeletionProcessController: IdentityDeletionProcessController,
        @Inject private readonly accountController: AccountController
    ) {
        super();
    }

    protected async executeInternal(): Promise<Result<IdentityDeletionProcessDTO>> {
        const activeIdentityDeletionProcess = await this.identityDeletionProcessController.getActiveIdentityDeletionProcess();

        if (typeof activeIdentityDeletionProcess === "undefined") {
            return Result.fail(RuntimeErrors.identity.noActiveIdentityDeletionProcess());
        }

        const approvedIdentityDeletionProcess = await this.identityDeletionProcessController.approveIdentityDeletion(activeIdentityDeletionProcess.id.toString());

        await this.accountController.syncDatawallet();
        return Result.ok(IdentityDeletionProcessMapper.toIdentityDeletionProcessDTO(approvedIdentityDeletionProcess));
    }
}
