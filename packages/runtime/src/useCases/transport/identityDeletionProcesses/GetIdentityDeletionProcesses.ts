import { Result } from "@js-soft/ts-utils";
import { IdentityDeletionProcessController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { IdentityDeletionProcessDTO } from "../../../types/transport/IdentityDeletionProcessDTO";
import { UseCase } from "../../common";
import { IdentityDeletionProcessMapper } from "./IdentityDeletionProcessMapper";

export class GetIdentityDeletionProcessesUseCase extends UseCase<void, IdentityDeletionProcessDTO[]> {
    public constructor(@Inject private readonly identityDeletionProcessController: IdentityDeletionProcessController) {
        super();
    }

    protected async executeInternal(): Promise<Result<IdentityDeletionProcessDTO[]>> {
        const identityDeletionProcesses = await this.identityDeletionProcessController.getIdentityDeletionProcesses();

        return Result.ok(IdentityDeletionProcessMapper.toIdentityDeletionProcessDTOList(identityDeletionProcesses));
    }
}
