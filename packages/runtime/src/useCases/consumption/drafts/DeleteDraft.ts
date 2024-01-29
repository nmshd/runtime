import { Result } from "@js-soft/ts-utils";
import { Draft, DraftsController } from "@nmshd/consumption";
import { AccountController, CoreId } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { LocalDraftIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface DeleteDraftRequest {
    id: LocalDraftIdString;
}

class Validator extends SchemaValidator<DeleteDraftRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("DeleteDraftRequest"));
    }
}

export class DeleteDraftUseCase extends UseCase<DeleteDraftRequest, void> {
    public constructor(
        @Inject private readonly draftController: DraftsController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: DeleteDraftRequest): Promise<Result<void>> {
        const draft = await this.draftController.getDraft(CoreId.from(request.id));
        if (!draft) {
            return Result.fail(RuntimeErrors.general.recordNotFound(Draft));
        }

        await this.draftController.deleteDraft(draft);
        await this.accountController.syncDatawallet();

        return Result.ok(undefined);
    }
}
