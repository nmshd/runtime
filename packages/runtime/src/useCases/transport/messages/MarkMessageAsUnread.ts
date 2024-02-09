import { Result } from "@js-soft/ts-utils";
import { AccountController, CoreId, MessageController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { MessageIdString, SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface MarkMessageAsUnreadRequest {
    id: MessageIdString;
}

class Validator extends SchemaValidator<MarkMessageAsUnreadRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("MarkMessageAsUnreadRequest"));
    }
}

export class MarkMessageAsUnreadUseCase extends UseCase<MarkMessageAsUnreadRequest, void> {
    public constructor(
        @Inject private readonly messageController: MessageController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: MarkMessageAsUnreadRequest): Promise<Result<void>> {
        await this.messageController.markMessageAsUnread(CoreId.from(request.id));

        await this.accountController.syncDatawallet();

        return Result.ok(undefined);
    }
}
