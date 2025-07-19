import { Serializable } from "@js-soft/ts-serval";
import { ArbitraryMessageContent, Mail, Notification, Request, ResponseWrapper } from "@nmshd/content";
import { CoreBuffer } from "@nmshd/crypto";
import { MessageDTO, MessageWithAttachmentsDTO } from "@nmshd/runtime-types";
import { File, Message, MessageRecipient } from "@nmshd/transport";
import { FileMapper } from "../files/FileMapper";
import { DownloadAttachmentResponse } from "./DownloadAttachment";

export class MessageMapper {
    public static toDownloadAttachmentResponse(buffer: CoreBuffer, file: File): DownloadAttachmentResponse {
        return {
            content: buffer.buffer,
            filename: file.filename,
            mimetype: file.mimetype
        };
    }

    public static toMessageWithAttachmentsDTO(message: Message, attachments: File[]): MessageWithAttachmentsDTO {
        return {
            id: message.id.toString(),
            isOwn: message.isOwn,
            content: this.toMessageContent(message.content),
            createdBy: message.createdBy.toString(),
            createdByDevice: message.createdByDevice.toString(),
            recipients: this.toRecipients(message.recipients),
            createdAt: message.createdAt.toString(),
            attachments: attachments.map((f) => FileMapper.toFileDTO(f)),
            wasReadAt: message.wasReadAt?.toString()
        };
    }

    public static toMessageDTO(message: Message): MessageDTO {
        return {
            id: message.id.toString(),
            isOwn: message.isOwn,
            content: this.toMessageContent(message.content),
            createdBy: message.createdBy.toString(),
            createdByDevice: message.createdByDevice.toString(),
            recipients: this.toRecipients(message.recipients),
            createdAt: message.createdAt.toString(),
            attachments: message.attachments.map((a) => a.toString()),
            wasReadAt: message.wasReadAt?.toString()
        };
    }

    public static toMessageDTOList(messages: Message[]): MessageDTO[] {
        return messages.map((message) => this.toMessageDTO(message));
    }

    private static toRecipients(recipients: MessageRecipient[]) {
        return recipients.map((r) => {
            return {
                address: r.address.toString(),
                receivedAt: r.receivedAt?.toString(),
                receivedByDevice: r.receivedByDevice?.toString(),
                relationshipId: r.relationshipId?.toString()
            };
        });
    }

    private static toMessageContent(content: Serializable) {
        if (
            !(
                content instanceof Mail ||
                content instanceof Request ||
                content instanceof ResponseWrapper ||
                content instanceof Notification ||
                content instanceof ArbitraryMessageContent
            )
        ) {
            return ArbitraryMessageContent.from({ value: content }).toJSON();
        }

        return content.toJSON();
    }
}
