import { Result } from "@js-soft/ts-utils";
import { AccountController, IdentityDeletionProcessController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { IdentityDeletionProcessDTO } from "../../../types/transport/IdentityDeletionProcessDTO";
import { RuntimeErrors, UseCase } from "../../common";
import { IdentityDeletionProcessMapper } from "./IdentityDeletionProcessMapper";

export interface CancelIdentityDeletionProcessResponse {
    identityDeletionProcess: IdentityDeletionProcessDTO;
}

export class CancelIdentityDeletionProcessUseCase extends UseCase<void, CancelIdentityDeletionProcessResponse> {
    public constructor(
        @Inject private readonly identityDeletionProcessController: IdentityDeletionProcessController,
        @Inject private readonly accountController: AccountController
    ) {
        super();
    }

    protected async executeInternal(): Promise<Result<CancelIdentityDeletionProcessResponse>> {
        const activeIdentityDeletionProcess = await this.identityDeletionProcessController.getActiveIdentityDeletionProcess();

        if (!activeIdentityDeletionProcess) {
            return Result.fail(RuntimeErrors.identity.noActiveIdentityDeletionProcess());
        }

        const cancelledIdentityDeletionProcess = await this.identityDeletionProcessController.cancelIdentityDeletion(activeIdentityDeletionProcess.id.toString());

        await this.accountController.syncDatawallet();
        return Result.ok({
            identityDeletionProcess: IdentityDeletionProcessMapper.toIdentityDeletionProcessDTO(cancelledIdentityDeletionProcess)
        });
    }
}
