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

        if (this.isPseudonymizationRequired(message.cache.recipients, message.relationshipIds)) {
            const pseudonym = await this.getPseudonymizedAddress(message.cache.recipients[0].address.toString());
            return {
                id: message.id.toString(),
                content: this.getPseudonymizedMessageContent(message.cache.content.toJSON(), message.cache.recipients, pseudonym),
                createdBy: message.cache.createdBy.toString(),
                createdByDevice: message.cache.createdByDevice.toString(),
                recipients: this.getPseudonymizedRecipients(message.cache.recipients, message.relationshipIds, pseudonym),
                createdAt: message.cache.createdAt.toString(),
                attachments: attachments.map((f) => FileMapper.toFileDTO(f)),
                isOwn: message.isOwn,
                wasReadAt: message.wasReadAt?.toString()
            };
        }
        return {
            id: message.id.toString(),
            content: message.cache.content.toJSON(),
            createdBy: message.cache.createdBy.toString(),
            createdByDevice: message.cache.createdByDevice.toString(),
            recipients: message.cache.recipients.map((r, i) => this.toRecipient(r, message.relationshipIds[i])),
            createdAt: message.cache.createdAt.toString(),
            attachments: attachments.map((f) => FileMapper.toFileDTO(f)),
            isOwn: message.isOwn
        };
    }

    public static async toMessageDTO(message: Message): Promise<MessageDTO> {
        if (!message.cache) {
            throw RuntimeErrors.general.cacheEmpty(Message, message.id.toString());
        }

        if (this.isPseudonymizationRequired(message.cache.recipients, message.relationshipIds)) {
            const pseudonym = await this.getPseudonymizedAddress(message.cache.recipients[0].address.toString());
            return {
                id: message.id.toString(),
                content: this.getPseudonymizedMessageContent(message.cache.content.toJSON(), message.cache.recipients, pseudonym),
                createdBy: message.cache.createdBy.toString(),
                createdByDevice: message.cache.createdByDevice.toString(),
                recipients: this.getPseudonymizedRecipients(message.cache.recipients, message.relationshipIds, pseudonym),
                createdAt: message.cache.createdAt.toString(),
                attachments: message.cache.attachments.map((a) => a.toString()),
                isOwn: message.isOwn,
                wasReadAt: message.wasReadAt?.toString()
            };
        }
        return {
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
    }

    public static async toMessageDTOList(messages: Message[]): Promise<MessageDTO[]> {
        return await Promise.all(messages.map((message) => this.toMessageDTO(message)));
    }

    private static getPseudonymizedRecipients(recipients: MessageEnvelopeRecipient[], relationshipIds: CoreId[], pseudonym: string) {
        let index = -1;
        return recipients.map((r) => {
            if (r.address.toString() === pseudonym) {
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

    private static isPseudonymizationRequired(recipients: MessageEnvelopeRecipient[], relationshipIds: CoreId[]): boolean {
        return recipients.length === relationshipIds.length ? false : true;
    }

    private static async getPseudonymizedMessageContent(messageContent: any, recipients: MessageEnvelopeRecipient[], pseudonym: string): Promise<any> {
        if (messageContent["@type"] === "Mail") {
            const mail = messageContent as MailJSON;
            const recipientAddresses = recipients.map((recipient) => recipient.address.toString());
            mail.to = await Promise.all(mail.to.map((toAddress) => (recipientAddresses.includes(toAddress) ? toAddress : pseudonym)));
            if (mail.cc) {
                mail.cc = await Promise.all(mail.cc.map((ccAddress) => (recipientAddresses.includes(ccAddress) ? ccAddress : pseudonym)));
            }
        }
        return messageContent;
    }

    private static async getPseudonymizedAddress(address: string): Promise<string> {
        const backboneHostname = address.split(":")[2]; // did:e:backboneHostname:...
        const pseudoPublicKey = CoreBuffer.fromUtf8("deleted identity");
        return (await IdentityUtil.createAddress({ algorithm: 1, publicKey: pseudoPublicKey }, backboneHostname)).toString();
    }
}
