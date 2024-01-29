import { Serializable } from "@js-soft/ts-serval";
import { Result } from "@js-soft/ts-utils";
import { Draft, DraftsController } from "@nmshd/consumption";
import { AccountController, CoreId } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { DraftDTO } from "../../../types";
import { LocalDraftIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { DraftMapper } from "./DraftMapper";

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
