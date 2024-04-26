import { Result } from "@js-soft/ts-utils";
import { AccountController, IdentityDeletionProcessController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { IdentityDeletionProcessDTO } from "../../../types/transport/IdentityDeletionProcessDTO";
import { RuntimeErrors, UseCase } from "../../common";
import { IdentityDeletionProcessMapper } from "./IdentityDeletionProcessMapper";

export interface RejectIdentityDeletionProcessResponse {
    identityDeletionProcess: IdentityDeletionProcessDTO;
}

export class RejectIdentityDeletionProcessUseCase extends UseCase<void, RejectIdentityDeletionProcessResponse> {
    public constructor(
        @Inject private readonly identityDeletionProcessController: IdentityDeletionProcessController,
        @Inject private readonly accountController: AccountController
    ) {
        super();
    }

    protected async executeInternal(): Promise<Result<RejectIdentityDeletionProcessResponse>> {
        const activeIdentityDeletionProcess = await this.identityDeletionProcessController.getActiveIdentityDeletionProcess();

        if (!activeIdentityDeletionProcess) {
            return Result.fail(RuntimeErrors.identity.noActiveIdentityDeletionProcess());
        }

        const rejectedIdentityDeletionProcess = await this.identityDeletionProcessController.rejectIdentityDeletion(activeIdentityDeletionProcess.id.toString());

        await this.accountController.syncDatawallet();
        return Result.ok({
            identityDeletionProcess: IdentityDeletionProcessMapper.toIdentityDeletionProcessDTO(rejectedIdentityDeletionProcess)
        });
    }
}
