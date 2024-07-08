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
            recipients: this.getRecipients(message.cache.recipients, message.relationshipIds),
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
        return {
            id: message.id.toString(),
            content: message.cache.content.toJSON(),
            createdBy: message.cache.createdBy.toString(),
            createdByDevice: message.cache.createdByDevice.toString(),
            recipients: this.getRecipients(message.cache.recipients, message.relationshipIds),
            createdAt: message.cache.createdAt.toString(),
            attachments: message.cache.attachments.map((a) => a.toString()),
            isOwn: message.isOwn,
            wasReadAt: message.wasReadAt?.toString()
        };
    }

    public static async toMessageDTOList(messages: Message[]): Promise<MessageDTO[]> {
        return await Promise.all(messages.map((message) => this.toMessageDTO(message)));
    }

    private static getRecipients(recipients: MessageEnvelopeRecipient[], relationshipIds: CoreId[]) {
        let index = -1;
        return recipients.map((r) => {
            if (r.address.toString() === process.env.pseudonym) {
                return this.toRecipient(r);
            }
            index += 1;
            return this.toRecipient(r, relationshipIds[index]);
        });
    }

    private static toRecipient(recipient: MessageEnvelopeRecipient, relationshipId?: CoreId): RecipientDTO {
        return {
            address: recipient.address.toString(),
            receivedAt: recipient.receivedAt?.toString(),
            receivedByDevice: recipient.receivedByDevice?.toString(),
            relationshipId: relationshipId?.toString()
        };
    }
}
