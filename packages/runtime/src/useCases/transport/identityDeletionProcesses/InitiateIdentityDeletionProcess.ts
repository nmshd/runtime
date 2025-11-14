import { Result } from "@js-soft/ts-utils";
import { IdentityDeletionProcessDTO } from "@nmshd/runtime-types";
import { AccountController, IdentityDeletionProcessController, IdentityDeletionProcessStatus } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common/index.js";
import { IdentityDeletionProcessMapper } from "./IdentityDeletionProcessMapper.js";

export interface InitiateIdentityDeletionProcessRequest {
    lengthOfGracePeriodInDays?: number;
}

class Validator extends SchemaValidator<InitiateIdentityDeletionProcessRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("InitiateIdentityDeletionProcessRequest"));
    }
}

export class InitiateIdentityDeletionProcessUseCase extends UseCase<InitiateIdentityDeletionProcessRequest, IdentityDeletionProcessDTO> {
    public constructor(
        @Inject private readonly identityDeletionProcessController: IdentityDeletionProcessController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: InitiateIdentityDeletionProcessRequest): Promise<Result<IdentityDeletionProcessDTO>> {
        const identityDeletionProcess = await this.identityDeletionProcessController.getIdentityDeletionProcessByStatus(IdentityDeletionProcessStatus.Active);
        if (identityDeletionProcess) return Result.fail(RuntimeErrors.identityDeletionProcess.activeIdentityDeletionProcessAlreadyExists());

        const initiatedIdentityDeletionProcess = await this.identityDeletionProcessController.initiateIdentityDeletionProcess(request.lengthOfGracePeriodInDays);
        await this.accountController.syncDatawallet();
        return Result.ok(IdentityDeletionProcessMapper.toIdentityDeletionProcessDTO(initiatedIdentityDeletionProcess));
    }
}
