import { Result } from "@js-soft/ts-utils";
import { AccountController, CoreId, MessageController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { MessageIdString, SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface MarkMessageAsReadRequest {
    id: MessageIdString;
}

class Validator extends SchemaValidator<MarkMessageAsReadRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("MarkMessageAsReadRequest"));
    }
}

export class MarkMessageAsReadUseCase extends UseCase<MarkMessageAsReadRequest, void> {
    public constructor(
        @Inject private readonly messageController: MessageController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: MarkMessageAsReadRequest): Promise<Result<void>> {
        await this.messageController.markMessageAsRead(CoreId.from(request.id));

        await this.accountController.syncDatawallet();

        return Result.ok(undefined);
    }
}
