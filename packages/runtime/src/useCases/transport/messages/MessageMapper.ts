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
import { CoreBuffer } from "@nmshd/crypto";
import { CoreId, File, Message, MessageEnvelopeRecipient } from "@nmshd/transport";
import { MessageDTO, MessageWithAttachmentsDTO, RecipientDTO } from "../../../types";
import { RuntimeErrors } from "../../common";
import { FileMapper } from "../files/FileMapper";
import { DownloadAttachmentResponse } from "./DownloadAttachment";

export class MessageMapper {
    public static toDownloadAttachmentResponse(buffer: CoreBuffer, file: File): DownloadAttachmentResponse {
        if (!file.cache) {
            throw RuntimeErrors.general.cacheEmpty(File, file.id.toString());
        }

        return {
            content: buffer.buffer,
            filename: file.cache.filename ? file.cache.filename : file.id.toString(),
            mimetype: file.cache.mimetype
        };
    }

    public static toMessageWithAttachmentsDTO(message: Message, attachments: File[]): MessageWithAttachmentsDTO {
        if (!message.cache) {
            throw RuntimeErrors.general.cacheEmpty(Message, message.id.toString());
        }

        return {
            id: message.id.toString(),
            content: message.cache.content.toJSON(),
            createdBy: message.cache.createdBy.toString(),
            createdByDevice: message.cache.createdByDevice.toString(),
            recipients: message.cache.recipients.map((r, i) => this.toRecipient(r, message.relationshipIds[i])),
            createdAt: message.cache.createdAt.toString(),
            attachments: attachments.map((f) => FileMapper.toFileDTO(f)),
            isOwn: message.isOwn,
            wasReadAt: message.wasReadAt?.toString()
        };
    }

    public static toMessageDTO(message: Message): MessageDTO {
        if (!message.cache) {
            throw RuntimeErrors.general.cacheEmpty(Message, message.id.toString());
        }
        if (
            !(
                message.cache.content instanceof Mail ||
                message.cache.content instanceof Request ||
                message.cache.content instanceof ResponseWrapper ||
                message.cache.content instanceof Notification ||
                message.cache.content instanceof ArbitraryMessageContent
            )
        ) {
            throw RuntimeErrors.general.invalidPropertyValue(
                `The content type of message ${message.id} is neither Mail nor Request nor ResponseWrapper nor Notification nor ArbitraryMessageContent.`
            );
        }

        return {
            id: message.id.toString(),
            content: message.cache.content.toJSON() as MailJSON | ResponseWrapperJSON | RequestJSON | NotificationJSON | ArbitraryMessageContentJSON,
            createdBy: message.cache.createdBy.toString(),
            createdByDevice: message.cache.createdByDevice.toString(),
            recipients: message.cache.recipients.map((r, i) => this.toRecipient(r, message.relationshipIds[i])),
            createdAt: message.cache.createdAt.toString(),
            attachments: message.cache.attachments.map((a) => a.toString()),
            isOwn: message.isOwn,
            wasReadAt: message.wasReadAt?.toString()
        };
    }

    public static toMessageDTOList(messages: Message[]): MessageDTO[] {
        return messages.map((message) => this.toMessageDTO(message));
    }

    private static toRecipient(recipient: MessageEnvelopeRecipient, relationshipId: CoreId): RecipientDTO {
        return {
            address: recipient.address.toString(),
            receivedAt: recipient.receivedAt?.toString(),
            receivedByDevice: recipient.receivedByDevice?.toString(),
            relationshipId: relationshipId.toString()
        };
    }
}
