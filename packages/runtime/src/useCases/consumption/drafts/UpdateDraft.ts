import { Serializable } from "@js-soft/ts-serval";
import { Result } from "@js-soft/ts-utils";
import { Draft, DraftsController } from "@nmshd/consumption";
import { CoreId } from "@nmshd/core-types";
import { DraftDTO } from "@nmshd/runtime-types";
import { AccountController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { LocalDraftIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common/index.js";
import { DraftMapper } from "./DraftMapper.js";

export interface UpdateDraftRequest {
    id: LocalDraftIdString;
    content: any;
}

class Validator extends SchemaValidator<UpdateDraftRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("UpdateDraftRequest"));
    }
}

export class UpdateDraftUseCase extends UseCase<UpdateDraftRequest, DraftDTO> {
    public constructor(
        @Inject private readonly draftController: DraftsController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: UpdateDraftRequest): Promise<Result<DraftDTO>> {
        const draft = await this.draftController.getDraft(CoreId.from(request.id));
        if (!draft) {
            return Result.fail(RuntimeErrors.general.recordNotFound(Draft));
        }

        draft.content = Serializable.fromUnknown(request.content);
        await this.draftController.updateDraft(draft);
        await this.accountController.syncDatawallet();

        return Result.ok(DraftMapper.toDraftDTO(draft));
    }
}
