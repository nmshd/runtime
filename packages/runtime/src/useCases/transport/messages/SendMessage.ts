import { Serializable } from "@js-soft/ts-serval";
import { ApplicationError, Result } from "@js-soft/ts-utils";
import { OutgoingRequestsController } from "@nmshd/consumption";
import { ArbitraryMessageContent, Mail, Notification, Request, ResponseWrapper } from "@nmshd/content";
import { CoreAddress, CoreError, CoreId } from "@nmshd/core-types";
import { AccountController, File, FileController, MessageController, PeerDeletionStatus, RelationshipsController, TransportCoreErrors } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import _ from "lodash";
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
        @Inject private readonly relationshipsController: RelationshipsController,
        @Inject private readonly messageController: MessageController,
        @Inject private readonly fileController: FileController,
        @Inject private readonly accountController: AccountController,
        @Inject private readonly outgoingRequestsController: OutgoingRequestsController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: SendMessageRequest): Promise<Result<MessageDTO>> {
        const validationError = await this.validateMessage(request.content, request.recipients);
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

    private async validateMessage(content: any, recipients: string[]) {
        const transformedContent = Serializable.fromUnknown(content);
        if (
            !(
                transformedContent instanceof Mail ||
                transformedContent instanceof ResponseWrapper ||
                transformedContent instanceof Notification ||
                transformedContent instanceof ArbitraryMessageContent ||
                transformedContent instanceof Request
            )
        ) {
            return RuntimeErrors.general.invalidPropertyValue(
                "The content of a Message must either be a Mail, Request, ResponseWrapper, Notification or an ArbitraryMessageContent."
            );
        }

        // Notifications can be sent to peers of any kind, especially to peers in deletion. The underlying Transport library will validate if it is really possible to send the Notification.
        if (transformedContent instanceof Notification) return;

        const recipientsValidationError = await this.validateMessageRecipients(transformedContent, recipients);
        if (recipientsValidationError) return recipientsValidationError;

        if (transformedContent instanceof Request) {
            const requestValidationError = await this.validateRequestAsMessageContent(transformedContent, CoreAddress.from(recipients[0]));
            if (requestValidationError) return requestValidationError;
        }

        return;
    }

    private async validateMessageRecipients(content: Serializable, recipients: string[]): Promise<CoreError | ApplicationError | undefined> {
        if (content instanceof Request && recipients.length !== 1) {
            return RuntimeErrors.general.invalidPropertyValue("Only one recipient is allowed for sending Requests.");
        }

        const peersWithNoActiveRelationship: string[] = [];
        const peersInDeletion: string[] = [];
        const deletedPeers: string[] = [];

        for (const recipient of recipients) {
            const relationship = await this.relationshipsController.getActiveRelationshipToIdentity(CoreAddress.from(recipient));

            if (!relationship) {
                peersWithNoActiveRelationship.push(recipient);
                continue;
            }

            if (relationship.peerDeletionInfo?.deletionStatus === PeerDeletionStatus.ToBeDeleted) {
                peersInDeletion.push(recipient);
            }

            if (relationship.peerDeletionInfo?.deletionStatus === PeerDeletionStatus.Deleted) {
                deletedPeers.push(recipient);
            }
        }

        if (peersWithNoActiveRelationship.length > 0) return TransportCoreErrors.messages.hasNoActiveRelationship(peersWithNoActiveRelationship);

        if (peersInDeletion.length > 0) return TransportCoreErrors.messages.peerIsInDeletion(peersInDeletion);

        if (deletedPeers.length > 0) return TransportCoreErrors.messages.peerIsDeleted(deletedPeers);

        return undefined;
    }

    private async validateRequestAsMessageContent(request: Request, recipient: CoreAddress): Promise<ApplicationError | undefined> {
        if (!request.id) return RuntimeErrors.general.invalidPropertyValue("The Request must have an id.");

        const localRequest = await this.outgoingRequestsController.getOutgoingRequest(request.id);
        if (!localRequest) return RuntimeErrors.general.recordNotFound(Request);

        if (!_.isEqual(request.toJSON(), localRequest.content.toJSON())) {
            return RuntimeErrors.general.invalidPropertyValue("The sent Request must have the same content as the LocalRequest.");
        }

        if (!recipient.equals(localRequest.peer)) return RuntimeErrors.general.invalidPropertyValue("The recipient does not match the Request's peer.");

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
