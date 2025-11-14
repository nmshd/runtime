import { Result } from "@js-soft/ts-utils";
import { IdentityDeletionProcessDTO } from "@nmshd/runtime-types";
import { IdentityDeletionProcess, IdentityDeletionProcessController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { IdentityDeletionProcessIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common/index.js";
import { IdentityDeletionProcessMapper } from "./IdentityDeletionProcessMapper.js";

export interface GetIdentityDeletionProcessRequest {
    id: IdentityDeletionProcessIdString;
}

class Validator extends SchemaValidator<GetIdentityDeletionProcessRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("GetIdentityDeletionProcessRequest"));
    }
}

export class GetIdentityDeletionProcessUseCase extends UseCase<GetIdentityDeletionProcessRequest, IdentityDeletionProcessDTO> {
    public constructor(
        @Inject private readonly identityDeletionProcessController: IdentityDeletionProcessController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: GetIdentityDeletionProcessRequest): Promise<Result<IdentityDeletionProcessDTO>> {
        const identityDeletionProcess = await this.identityDeletionProcessController.getIdentityDeletionProcess(request.id);
        if (!identityDeletionProcess) return Result.fail(RuntimeErrors.general.recordNotFound(IdentityDeletionProcess));

        return Result.ok(IdentityDeletionProcessMapper.toIdentityDeletionProcessDTO(identityDeletionProcess));
    }
}
