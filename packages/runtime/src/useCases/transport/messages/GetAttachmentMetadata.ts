import { Result } from "@js-soft/ts-utils";
import { CoreId } from "@nmshd/core-types";
import { FileDTO } from "@nmshd/runtime-types";
import { File, FileController, Message, MessageController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { FileIdString, MessageIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { FileMapper } from "../files/FileMapper";

export interface GetAttachmentMetadataRequest {
    id: MessageIdString;
    attachmentId: FileIdString;
}

class Validator extends SchemaValidator<GetAttachmentMetadataRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("GetAttachmentMetadataRequest"));
    }
}

export class GetAttachmentMetadataUseCase extends UseCase<GetAttachmentMetadataRequest, FileDTO> {
    public constructor(
        @Inject private readonly messageController: MessageController,
        @Inject private readonly fileController: FileController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: GetAttachmentMetadataRequest): Promise<Result<FileDTO>> {
        const message = await this.messageController.getMessage(CoreId.from(request.id));
        if (!message) {
            return Result.fail(RuntimeErrors.general.recordNotFound(Message));
        }

        const attachment = message.attachments.find((a) => a.equals(CoreId.from(request.attachmentId)));
        if (!attachment) {
            return Result.fail(RuntimeErrors.messages.fileNotFoundInMessage(request.attachmentId));
        }

        const file = await this.fileController.getFile(attachment);
        if (!file) {
            return Result.fail(RuntimeErrors.general.recordNotFound(File));
        }

        return Result.ok(FileMapper.toFileDTO(file));
    }
}
