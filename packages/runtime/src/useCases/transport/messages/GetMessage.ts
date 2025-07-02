import { Result } from "@js-soft/ts-utils";
import { CoreId } from "@nmshd/core-types";
import { MessageWithAttachmentsDTO } from "@nmshd/runtime-types";
import { File, FileController, Message, MessageController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { MessageIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { MessageMapper } from "./MessageMapper";

export interface GetMessageRequest {
    id: MessageIdString;
}

class Validator extends SchemaValidator<GetMessageRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("GetMessageRequest"));
    }
}

export class GetMessageUseCase extends UseCase<GetMessageRequest, MessageWithAttachmentsDTO> {
    public constructor(
        @Inject private readonly messageController: MessageController,
        @Inject private readonly fileController: FileController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: GetMessageRequest): Promise<Result<MessageWithAttachmentsDTO>> {
        const message = await this.messageController.getMessage(CoreId.from(request.id));

        if (!message) {
            return Result.fail(RuntimeErrors.general.recordNotFound(Message));
        }

        if (!message.cache) {
            return Result.fail(RuntimeErrors.general.cacheEmpty(Message, message.id.toString()));
        }

        const attachments = await Promise.all(message.cache.attachments.map((id) => this.fileController.getFile(id)));
        if (attachments.some((f) => !f)) {
            throw new Error("A file could not be fetched.");
        }

        return Result.ok(MessageMapper.toMessageWithAttachmentsDTO(message, attachments as File[]));
    }
}
