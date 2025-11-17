import { Serializable } from "@js-soft/ts-serval";
import { ApplicationError, Result } from "@js-soft/ts-utils";
import { LocalRequestStatus, OutgoingRequestsController } from "@nmshd/consumption";
import {
    ArbitraryMessageContent,
    ArbitraryMessageContentJSON,
    Mail,
    MailJSON,
    Notification,
    NotificationJSON,
    Request,
    RequestJSON,
    ResponseWrapper,
    ResponseWrapperJSON
} from "@nmshd/content";
import { CoreAddress, CoreDate, CoreError, CoreId } from "@nmshd/core-types";
import { MessageDTO } from "@nmshd/runtime-types";
import { AccountController, File, FileController, MessageController, PeerDeletionStatus, RelationshipsController, RelationshipStatus, TransportCoreErrors } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import _ from "lodash";
import { AddressString, FileIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common/index.js";
import { MessageMapper } from "./MessageMapper.js";

interface AbstractSendMessageRequest<T> {
    /**
     * @minItems 1
     * @uniqueItems true
     */
    recipients: AddressString[];
    content: T;
    /**
     * @uniqueItems true
     */
    attachments?: FileIdString[];
}

export interface SendMessageRequest extends AbstractSendMessageRequest<MailJSON | ResponseWrapperJSON | NotificationJSON | ArbitraryMessageContentJSON | RequestJSON> {}

export interface SchemaValidatableSendMessageRequest extends AbstractSendMessageRequest<unknown> {}

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

        const recipientsValidationError = await this.validateMessageRecipients(transformedContent, recipients);
        if (recipientsValidationError) return recipientsValidationError;

        const mailRecipientsValidationError = this.validateMailRecipients(transformedContent, recipients);
        if (mailRecipientsValidationError) return mailRecipientsValidationError;

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
        const peersWithNeitherActiveNorTerminatedRelationship: string[] = [];
        const peersInDeletion: string[] = [];
        const deletedPeers: string[] = [];

        for (const recipient of recipients) {
            const relationship = await this.relationshipsController.getRelationshipToIdentity(CoreAddress.from(recipient));

            if (!relationship || relationship.status !== RelationshipStatus.Active) {
                peersWithNoActiveRelationship.push(recipient);

                if (!relationship || relationship.status !== RelationshipStatus.Terminated) {
                    peersWithNeitherActiveNorTerminatedRelationship.push(recipient);
                }

                continue;
            }

            if (relationship.peerDeletionInfo?.deletionStatus === PeerDeletionStatus.ToBeDeleted) {
                peersInDeletion.push(recipient);
                continue;
            }

            if (relationship.peerDeletionInfo?.deletionStatus === PeerDeletionStatus.Deleted) {
                deletedPeers.push(recipient);
            }
        }

        if (!(content instanceof Notification)) {
            if (peersWithNoActiveRelationship.length > 0) return RuntimeErrors.messages.hasNoActiveRelationship(peersWithNoActiveRelationship);

            if (peersInDeletion.length > 0) return RuntimeErrors.messages.peerIsInDeletion(peersInDeletion);
        }

        if (peersWithNeitherActiveNorTerminatedRelationship.length > 0) {
            return TransportCoreErrors.messages.hasNeitherActiveNorTerminatedRelationship(peersWithNeitherActiveNorTerminatedRelationship);
        }

        if (deletedPeers.length > 0) return TransportCoreErrors.messages.peerIsDeleted(deletedPeers);

        return;
    }

    private validateMailRecipients(content: Serializable, messageRecipients: string[]): ApplicationError | undefined {
        if (!(content instanceof Mail)) return;

        const ccRecipients = content.cc?.map((address) => address.toString()) ?? [];
        if (ccRecipients.length !== new Set(ccRecipients).size) {
            return RuntimeErrors.general.invalidPropertyValue("Some recipients in 'cc' are listed multiple times.");
        }

        const toRecipients = content.to.map((address) => address.toString());
        if (toRecipients.length !== new Set(toRecipients).size) {
            return RuntimeErrors.general.invalidPropertyValue("Some recipients in 'to' are listed multiple times.");
        }

        const duplicatesInToAndCc = _.intersection(ccRecipients, toRecipients);
        if (duplicatesInToAndCc.length > 0) {
            return RuntimeErrors.general.invalidPropertyValue(`The recipients '${duplicatesInToAndCc.join("', '")}' are put into both 'to' and 'cc'.`);
        }

        const mailRecipients = _.union(ccRecipients, toRecipients);
        const mismatchBetweenMailAndMessageRecipients = _.xor(messageRecipients, mailRecipients);
        if (mismatchBetweenMailAndMessageRecipients.length > 0) {
            return RuntimeErrors.general.invalidPropertyValue(
                `The identities '${mismatchBetweenMailAndMessageRecipients.join("', '")}' are not listed among both the Message recipients and the recipients in 'to'/'cc'.`
            );
        }

        return;
    }

    private async validateRequestAsMessageContent(request: Request, recipient: CoreAddress): Promise<ApplicationError | undefined> {
        if (!request.id) return RuntimeErrors.general.invalidPropertyValue("The Request must have an id.");

        const localRequest = await this.outgoingRequestsController.getOutgoingRequest(request.id);
        if (!localRequest) return RuntimeErrors.general.recordNotFound(Request);

        if (!_.isEqual(request.toJSON(), localRequest.content.toJSON())) {
            return RuntimeErrors.general.invalidPropertyValue("The sent Request must have the same content as the LocalRequest.");
        }

        if (request.expiresAt?.isBefore(CoreDate.utc())) {
            return RuntimeErrors.messages.cannotSendMessageWithExpiredRequest();
        }

        if (!recipient.equals(localRequest.peer)) return RuntimeErrors.general.invalidPropertyValue("The recipient does not match the Request's peer.");

        if (localRequest.status !== LocalRequestStatus.Draft) return RuntimeErrors.messages.cannotSendRequestThatWasAlreadySent();

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
