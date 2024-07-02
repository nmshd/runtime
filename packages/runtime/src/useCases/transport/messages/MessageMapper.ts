import { MailJSON } from "@nmshd/content";
import { CoreBuffer } from "@nmshd/crypto";
import { CoreId, File, IdentityUtil, Message, MessageEnvelopeRecipient } from "@nmshd/transport";
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

    public static async toMessageWithAttachmentsDTO(message: Message, attachments: File[]): Promise<MessageWithAttachmentsDTO> {
        if (!message.cache) {
            throw RuntimeErrors.general.cacheEmpty(Message, message.id.toString());
        }

        const messageDTO = {
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
        return (await this.pseudonymizeMessageContent(messageDTO)) as MessageWithAttachmentsDTO;
    }

    public static async toMessageDTO(message: Message): Promise<MessageDTO> {
        if (!message.cache) {
            throw RuntimeErrors.general.cacheEmpty(Message, message.id.toString());
        }

        const messageDTO = {
            id: message.id.toString(),
            content: message.cache.content.toJSON(),
            createdBy: message.cache.createdBy.toString(),
            createdByDevice: message.cache.createdByDevice.toString(),
            recipients: message.cache.recipients.map((r, i) => this.toRecipient(r, message.relationshipIds[i])),
            createdAt: message.cache.createdAt.toString(),
            attachments: message.cache.attachments.map((a) => a.toString()),
            isOwn: message.isOwn,
            wasReadAt: message.wasReadAt?.toString()
        };
        return (await this.pseudonymizeMessageContent(messageDTO)) as MessageDTO;
    }

    public static async toMessageDTOList(messages: Message[]): Promise<MessageDTO[]> {
        return await Promise.all(messages.map((message) => this.toMessageDTO(message)));
    }

    private static toRecipient(recipient: MessageEnvelopeRecipient, relationshipId?: CoreId): RecipientDTO {
        return {
            address: recipient.address.toString(),
            receivedAt: recipient.receivedAt?.toString(),
            receivedByDevice: recipient.receivedByDevice?.toString(),
            relationshipId: relationshipId?.toString()
        };
    }

    private static async pseudonymizeMessageContent(message: MessageDTO | MessageWithAttachmentsDTO): Promise<MessageDTO | MessageWithAttachmentsDTO> {
        if (message.content["@type"] === "Mail") {
            const mail: MailJSON = message.content;
            const recipientAddresses = message.recipients.map((recipient) => recipient.address);
            mail.to = await Promise.all(mail.to.map((toAddress) => (recipientAddresses.includes(toAddress) ? toAddress : this.getPseudonymizedAddress(toAddress))));
            if (mail.cc) {
                mail.cc = await Promise.all(mail.cc.map((ccAddress) => (recipientAddresses.includes(ccAddress) ? ccAddress : this.getPseudonymizedAddress(ccAddress))));
            }
            message.content = mail;
        }
        return message;
    }

    private static async getPseudonymizedAddress(address: string): Promise<string> {
        const backboneHostname = address.split(":")[2]; // did:e:backboneHostname:...
        const pseudoPublicKey = CoreBuffer.fromUtf8("deleted identity");
        return (await IdentityUtil.createAddress({ algorithm: 1, publicKey: pseudoPublicKey }, backboneHostname)).toString();
    }
}
