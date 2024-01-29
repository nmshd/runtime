import { Result } from "@js-soft/ts-utils";
import { AccountController, CoreAddress, CoreId, File, FileController, MessageController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { MessageDTO } from "../../../types";
import { AddressString, FileIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { MessageMapper } from "./MessageMapper";

export interface SendMessageRequest {
    /**
     * @minItems 1
     */
    recipients: AddressString[];
    content: any;

    attachments?: FileIdString[];
}

class Validator extends SchemaValidator<SendMessageRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("SendMessageRequest"));
    }
}

export class SendMessageUseCase extends UseCase<SendMessageRequest, MessageDTO> {
    public constructor(
        @Inject private readonly messageController: MessageController,
        @Inject private readonly fileController: FileController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: SendMessageRequest): Promise<Result<MessageDTO>> {
        const transformAttachmentsResult = await this.transformAttachments(request.attachments);
        if (transformAttachmentsResult.isError) {
            return Result.fail(transformAttachmentsResult.error);
        }

        const result = await this.messageController.sendMessage({
            recipients: request.recipients.map((r) => CoreAddress.from(r)),
            content: request.content,
            attachments: transformAttachmentsResult.value
        });

        await this.accountController.syncDatawallet();

        return Result.ok(MessageMapper.toMessageDTO(result));
    }

    private async transformAttachments(attachmentsIds?: string[]): Promise<Result<File[]>> {
        if (!attachmentsIds || attachmentsIds.length === 0) {
            return Result.ok([]);
        }

        const files: File[] = [];

        for (const attachmentId of attachmentsIds) {
            const file = await this.fileController.getFile(CoreId.from(attachmentId));

            if (!file) {
                return Result.fail(RuntimeErrors.general.recordNotFound(File));
            }

            files.push(file);
        }
        return Result.ok(files);
    }
}
