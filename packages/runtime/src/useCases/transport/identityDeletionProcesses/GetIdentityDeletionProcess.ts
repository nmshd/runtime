import { Result } from "@js-soft/ts-utils";
import { IdentityDeletionProcess, IdentityDeletionProcessController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { IdentityDeletionProcessDTO } from "../../../types/transport/IdentityDeletionProcessDTO";
import { IdentityDeletionProcessIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { IdentityDeletionProcessMapper } from "./IdentityDeletionProcessMapper";

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
