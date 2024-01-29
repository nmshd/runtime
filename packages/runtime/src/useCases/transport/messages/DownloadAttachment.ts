import { Result } from "@js-soft/ts-utils";
import { CoreId, File, FileController, Message, MessageController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { FileIdString, MessageIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { MessageMapper } from "./MessageMapper";

export interface DownloadAttachmentRequest {
    id: MessageIdString;
    attachmentId: FileIdString;
}

class Validator extends SchemaValidator<DownloadAttachmentRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("DownloadAttachmentRequest"));
    }
}

export interface DownloadAttachmentResponse {
    content: Uint8Array;
    filename: string;
    mimetype: string;
}

export class DownloadAttachmentUseCase extends UseCase<DownloadAttachmentRequest, DownloadAttachmentResponse> {
    public constructor(
        @Inject private readonly messageController: MessageController,
        @Inject private readonly fileController: FileController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: DownloadAttachmentRequest): Promise<Result<DownloadAttachmentResponse>> {
        const message = await this.messageController.getMessage(CoreId.from(request.id));
        if (!message) {
            return Result.fail(RuntimeErrors.general.recordNotFound(Message));
        }

        if (!message.cache) {
            throw RuntimeErrors.general.cacheEmpty(Message, message.id.toString());
        }

        const attachment = message.cache.attachments.find((a) => a.equals(CoreId.from(request.attachmentId)));
        if (!attachment) {
            return Result.fail(RuntimeErrors.messages.fileNotFoundInMessage(request.attachmentId));
        }

        const file = await this.fileController.getFile(attachment);
        if (!file) {
            return Result.fail(RuntimeErrors.general.recordNotFound(File));
        }

        const fileContent = await this.fileController.downloadFileContent(attachment);

        return Result.ok(MessageMapper.toDownloadAttachmentResponse(fileContent, file));
    }
}
