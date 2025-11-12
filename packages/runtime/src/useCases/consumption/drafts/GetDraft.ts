import { Result } from "@js-soft/ts-utils";
import { Draft, DraftsController } from "@nmshd/consumption";
import { CoreId } from "@nmshd/core-types";
import { DraftDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import { LocalDraftIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common/index.js";
import { DraftMapper } from "./DraftMapper.js";

export interface GetDraftRequest {
    id: LocalDraftIdString;
}

class Validator extends SchemaValidator<GetDraftRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("GetDraftRequest"));
    }
}

export class GetDraftUseCase extends UseCase<GetDraftRequest, DraftDTO> {
    public constructor(
        @Inject private readonly draftController: DraftsController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: GetDraftRequest): Promise<Result<DraftDTO>> {
        const draft = await this.draftController.getDraft(CoreId.from(request.id));
        if (!draft) {
            return Result.fail(RuntimeErrors.general.recordNotFound(Draft));
        }

        return Result.ok(DraftMapper.toDraftDTO(draft));
    }
}
