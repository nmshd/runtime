import { Serializable } from "@js-soft/ts-serval";
import { Result } from "@js-soft/ts-utils";
import { OutgoingRequestsController } from "@nmshd/consumption";
import { Request } from "@nmshd/content";
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
        @Inject private readonly outgoingRequestsController: OutgoingRequestsController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: SendMessageRequest): Promise<Result<MessageDTO>> {
        const validationError = await this.validateMessageContent(request.content, request.recipients);
        if (validationError) return Result.fail(validationError);

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

    private async validateMessageContent(content: any, recipients: string[]) {
        const transformedContent = Serializable.fromUnknown(content);
        if (!(transformedContent instanceof Request)) return;

        if (typeof transformedContent.id === "undefined") {
            return RuntimeErrors.general.invalidPropertyValue("The request must have an id.");
        }

        const localRequest = await this.outgoingRequestsController.getOutgoingRequest(transformedContent.id);
        if (!localRequest) return RuntimeErrors.general.recordNotFound(Request);

        if (recipients.length > 1) return RuntimeErrors.general.invalidPropertyValue("Only one recipient is allowed for sending requests.");

        const recipient = CoreAddress.from(recipients[0]);
        if (!recipient.equals(localRequest.peer)) return RuntimeErrors.general.invalidPropertyValue("The recipient does not match the request's peer.");

        return;
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
