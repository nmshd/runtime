import { Result } from "@js-soft/ts-utils";
import { CoreId } from "@nmshd/core-types";
import { MessageDTO } from "@nmshd/runtime-types";
import { AccountController, MessageController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { MessageIdString, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { MessageMapper } from "./MessageMapper";

export interface MarkMessageAsUnreadRequest {
    id: MessageIdString;
}

class Validator extends SchemaValidator<MarkMessageAsUnreadRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("MarkMessageAsUnreadRequest"));
    }
}

export class MarkMessageAsUnreadUseCase extends UseCase<MarkMessageAsUnreadRequest, MessageDTO> {
    public constructor(
        @Inject private readonly messageController: MessageController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: MarkMessageAsUnreadRequest): Promise<Result<MessageDTO>> {
        const updatedMessage = await this.messageController.markMessageAsUnread(CoreId.from(request.id));

        await this.accountController.syncDatawallet();

        return Result.ok(MessageMapper.toMessageDTO(updatedMessage));
    }
}
