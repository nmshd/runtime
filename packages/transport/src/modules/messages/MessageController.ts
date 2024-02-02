import { ISerializable } from "@js-soft/ts-serval";
import { log } from "@js-soft/ts-utils";
import { CoreBuffer, CryptoCipher, CryptoSecretKey, ICryptoSignature } from "@nmshd/crypto";
import { nameof } from "ts-simple-nameof";
import { CoreAddress, CoreCrypto, CoreDate, CoreErrors, CoreId, ICoreAddress, TransportError } from "../../core";
import { DbCollectionName } from "../../core/DbCollectionName";
import { ControllerName, TransportController } from "../../core/TransportController";
import { MessageSentEvent } from "../../events";
import { AccountController } from "../accounts/AccountController";
import { File } from "../files/local/File";
import { FileReference } from "../files/transmission/FileReference";
import { Relationship } from "../relationships/local/Relationship";
import { RelationshipsController } from "../relationships/RelationshipsController";
import { RelationshipSecretController } from "../relationships/RelationshipSecretController";
import { SynchronizedCollection } from "../sync/SynchronizedCollection";
import { BackboneGetMessagesResponse } from "./backbone/BackboneGetMessages";
import { BackbonePostMessagesRecipientRequest } from "./backbone/BackbonePostMessages";
import { MessageClient } from "./backbone/MessageClient";
import { CachedMessage } from "./local/CachedMessage";
import { Message } from "./local/Message";
import { ISendMessageParameters, SendMessageParameters } from "./local/SendMessageParameters";
import { MessageContentWrapper } from "./transmission/MessageContentWrapper";
import { MessageEnvelope } from "./transmission/MessageEnvelope";
import { MessageEnvelopeRecipient } from "./transmission/MessageEnvelopeRecipient";
import { MessageSignature } from "./transmission/MessageSignature";
import { MessageSigned } from "./transmission/MessageSigned";

export class MessageController extends TransportController {
    private client: MessageClient;
    private messages: SynchronizedCollection;

    private readonly relationships: RelationshipsController;
    private secrets: RelationshipSecretController;

    public constructor(parent: AccountController) {
        super(ControllerName.Message, parent);

        this.relationships = parent.relationships;
    }

    public override async init(): Promise<this> {
        await super.init();

        this.secrets = new RelationshipSecretController(this.parent);
        await this.secrets.init();

        this.client = new MessageClient(this.config, this.parent.authenticator);
        this.messages = await this.parent.getSynchronizedCollection(DbCollectionName.Messages);
        return this;
    }

    public async getMessages(query?: any): Promise<Message[]> {
        const messages = await this.messages.find(query);
        return this.parseArray<Message>(messages, Message);
    }

    public async getMessagesByRelationshipId(id: CoreId): Promise<Message[]> {
        return await this.getMessages({
            [nameof<Message>((m) => m.relationshipIds)]: {
                $contains: id.toString()
            }
        });
    }

    @log()
    public async getMessagesByAddress(address: CoreAddress): Promise<Message[]> {
        const relationship = await this.parent.relationships.getActiveRelationshipToIdentity(address);
        if (!relationship) {
            throw CoreErrors.messages.noMatchingRelationship(address.toString());
        }
        return await this.getMessagesByRelationshipId(relationship.id);
    }

    public async getReceivedMessages(): Promise<Message[]> {
        return await this.getMessages({
            [nameof<Message>((m) => m.isOwn)]: false
        });
    }

    public async getMessage(id: CoreId): Promise<Message | undefined> {
        const messageDoc = await this.messages.read(id.toString());
        return messageDoc ? Message.from(messageDoc) : undefined;
    }

    public async updateCache(ids: string[]): Promise<Message[]> {
        if (ids.length < 1) {
            return [];
        }

        const paginator = (await this.client.getMessages({ ids })).value;
        const promises = [];
        for await (const resultItem of paginator) {
            promises.push(this.updateCacheOfExistingMessageInDb(resultItem.id, resultItem));
        }
        return await Promise.all(promises);
    }

    public async fetchCaches(ids: CoreId[]): Promise<{ id: CoreId; cache: CachedMessage }[]> {
        if (ids.length === 0) return [];

        const backboneMessages = await (await this.client.getMessages({ ids: ids.map((id) => id.toString()) })).value.collect();

        const decryptionPromises = backboneMessages.map(async (m) => {
            const messageDoc = await this.messages.read(m.id);
            const message = Message.from(messageDoc);
            const envelope = this.getEnvelopeFromBackboneGetMessagesResponse(m);

            const cachedMessage = (await this.decryptMessage(envelope, message.secretKey))[0];
            return { id: CoreId.from(m.id), cache: cachedMessage };
        });

        return await Promise.all(decryptionPromises);
    }

    @log()
    private async updateCacheOfExistingMessageInDb(id: string, response?: BackboneGetMessagesResponse) {
        const messageDoc = await this.messages.read(id);
        if (!messageDoc) {
            throw CoreErrors.general.recordNotFound(Message, id);
        }

        const message = Message.from(messageDoc);

        await this.updateCacheOfMessage(message, response);
        await this.messages.update(messageDoc, message);
        return message;
    }

    private async updateCacheOfMessage(message: Message, response?: BackboneGetMessagesResponse) {
        const messageId = message.id.toString();

        if (!response) {
            response = (await this.client.getMessage(messageId)).value;
        }

        const envelope = this.getEnvelopeFromBackboneGetMessagesResponse(response);
        const [cachedMessage, messageKey] = await this.decryptMessage(envelope, message.secretKey);

        message.secretKey = messageKey;
        message.setCache(cachedMessage);
    }

    @log()
    public async loadPeerMessage(id: CoreId): Promise<Message> {
        const response = (await this.client.getMessage(id.toString())).value;

        const envelope = this.getEnvelopeFromBackboneGetMessagesResponse(response);
        const [cachedMessage, messageKey, relationship] = await this.decryptMessage(envelope);

        if (!relationship) {
            throw CoreErrors.general.recordNotFound(Relationship, envelope.id.toString());
        }

        const message = Message.from({
            id: envelope.id,
            isOwn: false,
            secretKey: messageKey,
            relationshipIds: [relationship.id]
        });
        message.setCache(cachedMessage);
        await this.messages.create(message);

        return message;
    }

    private getEnvelopeFromBackboneGetMessagesResponse(response: BackboneGetMessagesResponse) {
        const recipients = [];

        for (const recipient of response.recipients) {
            const sealedRecipient = MessageEnvelopeRecipient.from({
                encryptedKey: CryptoCipher.fromBase64(recipient.encryptedKey),
                address: CoreAddress.from(recipient.address),
                receivedAt: recipient.receivedAt ? CoreDate.from(recipient.receivedAt) : undefined,
                receivedByDevice: recipient.receivedByDevice ? CoreId.from(recipient.receivedByDevice) : undefined
            });
            recipients.push(sealedRecipient);
        }

        const envelope = MessageEnvelope.from({
            id: CoreId.from(response.id),
            createdAt: CoreDate.from(response.createdAt),
            createdBy: CoreAddress.from(response.createdBy),
            createdByDevice: CoreId.from(response.createdByDevice),
            cipher: CryptoCipher.fromBase64(response.body),
            attachments: response.attachments,
            recipients: recipients
        });

        return envelope;
    }

    @log()
    public async setMessageMetadata(idOrMessage: CoreId | Message, metadata: ISerializable): Promise<Message> {
        const id = idOrMessage instanceof CoreId ? idOrMessage.toString() : idOrMessage.id.toString();
        const messageDoc = await this.messages.read(id);
        if (!messageDoc) {
            throw CoreErrors.general.recordNotFound(Message, id.toString());
        }

        const message = Message.from(messageDoc);
        message.setMetadata(metadata);
        await this.messages.update(messageDoc, message);

        return message;
    }

    @log()
    public async sendMessage(parameters: ISendMessageParameters): Promise<Message> {
        const parsedParams = SendMessageParameters.from(parameters);
        if (!parsedParams.attachments) parsedParams.attachments = [];

        const secret: CryptoSecretKey = await CoreCrypto.generateSecretKey();
        const serializedSecret: string = secret.serialize(false);
        const addressArray: ICoreAddress[] = [];
        const envelopeRecipients: MessageEnvelopeRecipient[] = [];
        for (const recipient of parsedParams.recipients) {
            const relationship = await this.relationships.getActiveRelationshipToIdentity(recipient);
            if (!relationship) {
                throw CoreErrors.general.recordNotFound(Relationship, recipient.toString());
            }

            const cipherForRecipient: CryptoCipher = await this.secrets.encrypt(relationship.relationshipSecretId, serializedSecret);
            envelopeRecipients.push(
                MessageEnvelopeRecipient.from({
                    address: recipient,
                    encryptedKey: cipherForRecipient
                })
            );
            addressArray.push(recipient);
        }

        const publicAttachmentArray: CoreId[] = [];
        const fileReferences: FileReference[] = [];
        for (const fileObject of parsedParams.attachments) {
            const file = File.from(fileObject);
            fileReferences.push(file.toFileReference());
            publicAttachmentArray.push(file.id);
        }

        const plaintext: MessageContentWrapper = MessageContentWrapper.from({
            content: parsedParams.content,
            recipients: addressArray,
            createdAt: CoreDate.utc(),
            attachments: fileReferences
        });
        const serializedPlaintext: string = plaintext.serialize();

        const plaintextBuffer: CoreBuffer = CoreBuffer.fromUtf8(serializedPlaintext);

        const messageSignatures: MessageSignature[] = [];
        const relationshipIds = [];
        for (const recipient of parsedParams.recipients) {
            const relationship = await this.relationships.getActiveRelationshipToIdentity(CoreAddress.from(recipient));
            if (!relationship) {
                throw CoreErrors.general.recordNotFound(Relationship, recipient.toString());
            }

            const signature: ICryptoSignature = await this.secrets.sign(relationship.relationshipSecretId, plaintextBuffer);
            const messageSignature: MessageSignature = MessageSignature.from({
                recipient: recipient,
                signature: signature
            });
            messageSignatures.push(messageSignature);
            relationshipIds.push(relationship.id);
        }

        const signed: MessageSigned = MessageSigned.from({
            message: serializedPlaintext,
            signatures: messageSignatures
        });
        const serializedSigned: string = signed.serialize();
        const cipher: CryptoCipher = await CoreCrypto.encrypt(CoreBuffer.fromUtf8(serializedSigned), secret);

        const platformRecipients: BackbonePostMessagesRecipientRequest[] = envelopeRecipients.map((recipient) => {
            return {
                address: recipient.address.toString(),
                encryptedKey: recipient.encryptedKey.toBase64()
            };
        });

        const fileIds = publicAttachmentArray.map((attachment) => {
            return {
                id: attachment.id
            };
        });

        const response = (
            await this.client.createMessage({
                attachments: fileIds,
                body: cipher.toBase64(),
                recipients: platformRecipients
            })
        ).value;

        const cachedMessage: CachedMessage = CachedMessage.from({
            content: parsedParams.content,
            createdAt: CoreDate.from(response.createdAt),
            createdBy: this.parent.identity.identity.address,
            createdByDevice: this.parent.activeDevice.id,
            recipients: envelopeRecipients,
            attachments: publicAttachmentArray,
            receivedByEveryone: false
        });

        const message: Message = Message.from({
            id: CoreId.from(response.id),
            secretKey: secret,
            cache: cachedMessage,
            cachedAt: CoreDate.utc(),
            isOwn: true,
            relationshipIds: relationshipIds
        });

        await this.messages.create(message);

        this.eventBus.publish(new MessageSentEvent(this.parent.identity.address.toString(), message));

        return message;
    }

    private async decryptOwnEnvelope(envelope: MessageEnvelope, secretKey: CryptoSecretKey): Promise<MessageContentWrapper> {
        this.log.trace(`Decrypting own envelope with id ${envelope.id.toString()}...`);

        const plaintextMessageBuffer: CoreBuffer = await CoreCrypto.decrypt(envelope.cipher, secretKey);
        const signedMessage: MessageSigned = MessageSigned.deserialize(plaintextMessageBuffer.toUtf8());
        const messagePlain = MessageContentWrapper.from(JSON.parse(signedMessage.message));

        return messagePlain;
    }

    @log()
    private async decryptPeerEnvelope(envelope: MessageEnvelope, relationship: Relationship): Promise<[MessageContentWrapper, CryptoSecretKey]> {
        const ownKeyCipher = envelope.recipients.find((r) => this.parent.identity.isMe(r.address))?.encryptedKey;

        if (!ownKeyCipher) {
            throw CoreErrors.messages.ownAddressNotInList(envelope.id.toString());
        }

        const plaintextKeyBuffer = await this.secrets.decryptPeer(relationship.relationshipSecretId, ownKeyCipher, true);
        const plaintextKey: CryptoSecretKey = CryptoSecretKey.deserialize(plaintextKeyBuffer.toUtf8());
        const plaintextMessageBuffer: CoreBuffer = await CoreCrypto.decrypt(envelope.cipher, plaintextKey);

        const signedMessage: MessageSigned = MessageSigned.deserialize(plaintextMessageBuffer.toUtf8());

        const signature = signedMessage.signatures.find((s) => this.parent.identity.isMe(s.recipient))?.signature;

        if (!signature) {
            throw CoreErrors.messages.signatureListMismatch(envelope.id.toString());
        }

        const messagePlain = MessageContentWrapper.from(JSON.parse(signedMessage.message));
        if (signedMessage.signatures.length !== messagePlain.recipients.length) {
            this.log.debug(`Number of signatures does not match number of recipients from envelope ${envelope.id}.`);
        }

        const plainMessageBuffer: CoreBuffer = CoreBuffer.fromUtf8(signedMessage.message);
        const validSignature: boolean = await this.secrets.verifyPeer(relationship.relationshipSecretId, plainMessageBuffer, signature);
        if (!validSignature) {
            throw CoreErrors.messages.signatureNotValid();
        }

        if (messagePlain.recipients.length !== envelope.recipients.length) {
            this.log.debug(`Number of signed recipients within the message does not match number of recipients from envelope ${envelope.id}.`);
        }

        if (messagePlain.recipients.length !== signedMessage.signatures.length) {
            this.log.debug(`Number of signed recipients within the message does not match number of signatures from envelope ${envelope.id}.`);
        }

        const recipientFound: boolean = messagePlain.recipients.some((r) => this.parent.identity.isMe(r));

        if (!recipientFound) {
            throw CoreErrors.messages.plaintextMismatch(envelope.id.toString());
        }

        return [messagePlain, plaintextKey];
    }

    @log()
    private async decryptMessage(envelope: MessageEnvelope, secretKey?: CryptoSecretKey): Promise<[CachedMessage, CryptoSecretKey, Relationship?]> {
        this.log.trace(`Decrypting MessageEnvelope with id ${envelope.id}...`);
        let plainMessage: MessageContentWrapper;
        let messageKey: CryptoSecretKey;

        let relationship;
        if (this.parent.identity.isMe(envelope.createdBy)) {
            if (!secretKey) {
                throw new TransportError(`The own message (${envelope.id.toString()}) could not be decrypted, because no secret key was passed for it.`);
            }
            messageKey = secretKey;
            plainMessage = await this.decryptOwnEnvelope(envelope, secretKey);
        } else {
            relationship = await this.relationships.getActiveRelationshipToIdentity(envelope.createdBy);

            if (!relationship) {
                throw CoreErrors.messages.noMatchingRelationship(envelope.createdBy.toString());
            }

            const [peerMessage, peerKey] = await this.decryptPeerEnvelope(envelope, relationship);
            plainMessage = peerMessage;
            messageKey = peerKey;
        }

        this.log.trace("Message is valid. Fetching attachments for message...");
        const fileArray: CoreId[] = [];
        const promises = [];
        for (const fileReference of plainMessage.attachments) {
            promises.push(this.parent.files.getOrLoadFileByReference(fileReference));
            fileArray.push(fileReference.id);
        }
        await Promise.all(promises);

        this.log.trace("Attachments fetched. Creating message...");

        const cachedMessage: CachedMessage = CachedMessage.from({
            createdBy: envelope.createdBy,
            createdByDevice: envelope.createdByDevice,
            recipients: envelope.recipients,
            attachments: fileArray,
            content: plainMessage.content,
            createdAt: envelope.createdAt,
            receivedByEveryone: false
        });

        return [cachedMessage, messageKey, relationship];
    }
}
