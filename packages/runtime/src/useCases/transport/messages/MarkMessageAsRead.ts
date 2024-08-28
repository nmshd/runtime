import { Result } from "@js-soft/ts-utils";
import { CoreId } from "@nmshd/core-types";
import { AccountController, MessageController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { MessageDTO } from "../../../types";
import { MessageIdString, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { MessageMapper } from "./MessageMapper";

export interface MarkMessageAsReadRequest {
    id: MessageIdString;
}

class Validator extends SchemaValidator<MarkMessageAsReadRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("MarkMessageAsReadRequest"));
    }
}

export class MarkMessageAsReadUseCase extends UseCase<MarkMessageAsReadRequest, MessageDTO> {
    public constructor(
        @Inject private readonly messageController: MessageController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: MarkMessageAsReadRequest): Promise<Result<MessageDTO>> {
        const updatedMessage = await this.messageController.markMessageAsRead(CoreId.from(request.id));

        await this.accountController.syncDatawallet();

        return Result.ok(MessageMapper.toMessageDTO(updatedMessage));
    }
}
