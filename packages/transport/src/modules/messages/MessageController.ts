import { ISerializable } from "@js-soft/ts-serval";
import { log, Result } from "@js-soft/ts-utils";
import { CoreAddress, CoreDate, CoreId, FileReference, ICoreAddress, ICoreId } from "@nmshd/core-types";
import { CoreBuffer, CryptoCipher, CryptoSecretKey } from "@nmshd/crypto";
import { nameof } from "ts-simple-nameof";
import { DbCollectionName } from "../../core/DbCollectionName.js";
import { ControllerName, TransportController } from "../../core/TransportController.js";
import { CoreCrypto, TransportCoreErrors, TransportError } from "../../core/index.js";
import { MessageSentEvent, MessageWasReadAtChangedEvent } from "../../events/index.js";
import { AccountController } from "../accounts/AccountController.js";
import { IdentityUtil } from "../accounts/IdentityUtil.js";
import { File } from "../files/local/File.js";
import { RelationshipSecretController } from "../relationships/RelationshipSecretController.js";
import { RelationshipsController } from "../relationships/RelationshipsController.js";
import { PeerDeletionStatus } from "../relationships/local/PeerDeletionInfo.js";
import { Relationship } from "../relationships/local/Relationship.js";
import { RelationshipStatus } from "../relationships/transmission/RelationshipStatus.js";
import { SynchronizedCollection } from "../sync/SynchronizedCollection.js";
import { BackboneGetMessagesResponse } from "./backbone/BackboneGetMessages.js";
import { BackbonePostMessagesRecipientRequest } from "./backbone/BackbonePostMessages.js";
import { MessageClient } from "./backbone/MessageClient.js";
import { IBackboneMessageContents, Message } from "./local/Message.js";
import { MessageRecipient } from "./local/MessageRecipient.js";
import { ISendMessageParameters, SendMessageParameters } from "./local/SendMessageParameters.js";
import { MessageContentWrapper } from "./transmission/MessageContentWrapper.js";
import { MessageEnvelope } from "./transmission/MessageEnvelope.js";
import { MessageEnvelopeRecipient } from "./transmission/MessageEnvelopeRecipient.js";
import { MessageSignature } from "./transmission/MessageSignature.js";
import { MessageSigned } from "./transmission/MessageSigned.js";

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

        this.client = new MessageClient(this.config, this.parent.authenticator, this.transport.correlator);
        this.messages = await this.parent.getSynchronizedCollection(DbCollectionName.Messages);
        return this;
    }

    public async getMessages(query?: any): Promise<Message[]> {
        const messages = await this.messages.find(query);
        return this.parseArray<Message>(messages, Message);
    }

    public async getMessagesByRelationshipId(id: CoreId): Promise<Message[]> {
        return await this.getMessages({
            [`${nameof<Message>((m) => m.recipients)}.${nameof<MessageRecipient>((m) => m.relationshipId)}`]: id.toString()
        });
    }

    public async cleanupMessagesOfDecomposedRelationship(relationship: Relationship): Promise<void> {
        const messages = await this.getMessagesByRelationshipId(relationship.id);
        for (const message of messages) {
            await this.cleanupMessageOfDecomposedRelationship(message.id, relationship);
        }
    }

    private async cleanupMessageOfDecomposedRelationship(messageId: CoreId, relationship: Relationship): Promise<void> {
        const messageDoc = await this.messages.read(messageId.toString());
        const message = Message.from(messageDoc);

        // a received message only has one recipient (yourself) so it can be deleted without further looking into the recipients
        // also if the message is not own, it can be deleted when there is only one recipient
        if (!message.isOwn || message.recipients.length === 1) {
            await this.messages.delete(message);
            return;
        }

        const recipient = message.recipients.find((r) => r.relationshipId?.equals(relationship.id));
        if (!recipient) {
            this.log.warn(`Recipient not found in message ${message.id.toString()}`);
            return;
        }

        const pseudonym = await IdentityUtil.createAddress({ algorithm: 1, publicKey: CoreBuffer.fromUtf8("deleted identity") }, new URL(this.parent.config.baseUrl).hostname);

        recipient.address = pseudonym;
        recipient.relationshipId = undefined;

        if (message.recipients.every((r) => r.address.equals(pseudonym))) {
            await this.messages.delete(message);
            return;
        }

        await this.messages.update(messageDoc, message);
    }

    @log()
    public async getMessagesByAddress(address: CoreAddress): Promise<Message[]> {
        const relationship = await this.parent.relationships.getExistingRelationshipToIdentity(address);
        if (!relationship || relationship.status === RelationshipStatus.Pending) {
            throw new TransportError(
                `Due to the non-existence of a Relationship with 'Active', 'Terminated' or 'DeletionProposed' as status, there are no Messages to the peer with address '${address.toString()}' that could be displayed.`
            );
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

    public async updateBackboneData(ids: string[]): Promise<Message[]> {
        if (ids.length < 1) {
            return [];
        }

        const paginator = (await this.client.getMessages({ ids })).value;
        const promises = [];
        for await (const resultItem of paginator) {
            promises.push(this.updateBackboneDataOfExistingMessageInDb(resultItem.id, resultItem));
        }
        return await Promise.all(promises);
    }

    @log()
    private async updateBackboneDataOfExistingMessageInDb(id: string, response?: BackboneGetMessagesResponse) {
        const messageDoc = await this.messages.read(id);
        if (!messageDoc) {
            throw TransportCoreErrors.general.recordNotFound(Message, id);
        }

        const message = Message.from(messageDoc);

        await this.updateBackboneDataOfMessage(message, response);
        await this.messages.update(messageDoc, message);
        return message;
    }

    private async updateBackboneDataOfMessage(message: Message, response?: BackboneGetMessagesResponse) {
        const messageId = message.id.toString();

        response ??= (await this.client.getMessage(messageId)).value;

        const envelope = this.getEnvelopeFromBackboneGetMessagesResponse(response);
        const [backboneData, messageKey] = await this.decryptMessage(envelope, message.secretKey);

        message.secretKey = messageKey;

        message.updateWithBackboneData(backboneData);
    }

    @log()
    public async loadPeerMessage(id: CoreId): Promise<Message> {
        const response = (await this.client.getMessage(id.toString())).value;

        const envelope = this.getEnvelopeFromBackboneGetMessagesResponse(response);
        const [backboneData, messageKey, relationship] = await this.decryptMessage(envelope);

        if (!relationship) {
            throw TransportCoreErrors.general.recordNotFound(Relationship, envelope.id.toString());
        }

        const message = Message.from({
            id: envelope.id,
            isOwn: false,
            secretKey: messageKey,
            ...backboneData
        });
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
            throw TransportCoreErrors.general.recordNotFound(Message, id.toString());
        }

        const message = Message.from(messageDoc);
        message.setMetadata(metadata);
        await this.messages.update(messageDoc, message);

        return message;
    }

    public async markMessageAsRead(id: CoreId): Promise<Message> {
        const messageDoc = await this.messages.read(id.toString());
        if (!messageDoc) {
            throw TransportCoreErrors.general.recordNotFound(Message, id.toString());
        }

        const message = Message.from(messageDoc);
        if (message.wasReadAt) return message;

        message.wasReadAt = CoreDate.utc();
        await this.messages.update(messageDoc, message);

        this.eventBus.publish(new MessageWasReadAtChangedEvent(this.parent.identity.address.toString(), message));

        return message;
    }

    public async markMessageAsUnread(id: CoreId): Promise<Message> {
        const messageDoc = await this.messages.read(id.toString());
        if (!messageDoc) {
            throw TransportCoreErrors.general.recordNotFound(Message, id.toString());
        }

        const message = Message.from(messageDoc);
        if (!message.wasReadAt) return message;

        message.wasReadAt = undefined;
        await this.messages.update(messageDoc, message);

        this.eventBus.publish(new MessageWasReadAtChangedEvent(this.parent.identity.address.toString(), message));

        return message;
    }

    @log()
    public async sendMessage(parameters: ISendMessageParameters): Promise<Message> {
        const parsedParams = SendMessageParameters.from(parameters);
        parsedParams.attachments ??= [];

        const validationResult = await this.validateMessageRecipients(parsedParams.recipients);
        if (validationResult.isError) throw validationResult.error;

        const secret = await CoreCrypto.generateSecretKey();
        const serializedSecret = secret.serialize(false);
        const addressArray: ICoreAddress[] = [];
        const envelopeRecipients: MessageEnvelopeRecipient[] = [];

        for (const recipient of parsedParams.recipients) {
            const relationship = await this.relationships.getRelationshipToIdentity(recipient);

            if (!relationship) {
                throw new TransportError(`Due to the non-existence of a Relationship to the recipient with address '${recipient.toString()}', the Message cannot be sent.`);
            }

            const cipherForRecipient = await this.secrets.encrypt(relationship.relationshipSecretId, serializedSecret);
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
            fileReferences.push(file.toFileReference(this.transport.config.baseUrl));
            publicAttachmentArray.push(file.id);
        }

        const plaintext = MessageContentWrapper.from({
            content: parsedParams.content,
            recipients: addressArray,
            createdAt: CoreDate.utc(),
            attachments: fileReferences
        });
        const serializedPlaintext = plaintext.serialize();

        const plaintextBuffer = CoreBuffer.fromUtf8(serializedPlaintext);

        const messageSignatures: MessageSignature[] = [];

        // a object of address to relationshipId
        const addressToRelationshipId: Record<string, ICoreId> = {};

        for (const recipient of parsedParams.recipients) {
            const relationship = await this.relationships.getRelationshipToIdentity(CoreAddress.from(recipient));

            if (!relationship) {
                throw new TransportError(`Due to the non-existence of a Relationship to the recipient with address '${recipient.toString()}', the Message cannot be sent.`);
            }

            const signature = await this.secrets.sign(relationship.relationshipSecretId, plaintextBuffer);
            const messageSignature = MessageSignature.from({
                recipient: recipient,
                signature: signature
            });
            messageSignatures.push(messageSignature);

            addressToRelationshipId[recipient.toString()] = relationship.id;
        }

        const signed = MessageSigned.from({
            message: serializedPlaintext,
            signatures: messageSignatures
        });
        const serializedSigned = signed.serialize();
        const cipher = await CoreCrypto.encrypt(CoreBuffer.fromUtf8(serializedSigned), secret);

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

        const result = await this.client.createMessage({
            attachments: fileIds,
            body: cipher.toBase64(),
            recipients: platformRecipients
        });
        const value = result.value;

        const recipients = envelopeRecipients.map((r) =>
            MessageRecipient.from({
                address: r.address,
                encryptedKey: r.encryptedKey,
                receivedAt: r.receivedAt,
                receivedByDevice: r.receivedByDevice,
                relationshipId: addressToRelationshipId[r.address.toString()]
            })
        );

        const message = Message.from({
            id: CoreId.from(value.id),
            secretKey: secret,
            content: parsedParams.content,
            createdAt: CoreDate.from(value.createdAt),
            createdBy: this.parent.identity.identity.address,
            createdByDevice: this.parent.activeDevice.id,
            recipients,
            attachments: publicAttachmentArray,
            receivedByEveryone: false,
            isOwn: true
        });

        await this.messages.create(message);

        this.eventBus.publish(new MessageSentEvent(this.parent.identity.address.toString(), message));

        return message;
    }

    public async validateMessageRecipients(recipients: CoreAddress[]): Promise<Result<void>> {
        const peersWithNeitherActiveNorTerminatedRelationship: string[] = [];
        const deletedPeers: string[] = [];

        for (const recipient of recipients) {
            const relationship = await this.relationships.getRelationshipToIdentity(recipient);

            if (!relationship || !(relationship.status === RelationshipStatus.Terminated || relationship.status === RelationshipStatus.Active)) {
                peersWithNeitherActiveNorTerminatedRelationship.push(recipient.address);
                continue;
            }

            if (relationship.peerDeletionInfo?.deletionStatus === PeerDeletionStatus.Deleted) {
                deletedPeers.push(recipient.address);
            }
        }

        if (peersWithNeitherActiveNorTerminatedRelationship.length > 0) {
            return Result.fail(TransportCoreErrors.messages.hasNeitherActiveNorTerminatedRelationship(peersWithNeitherActiveNorTerminatedRelationship));
        }

        if (deletedPeers.length > 0) return Result.fail(TransportCoreErrors.messages.peerIsDeleted(deletedPeers));

        return Result.ok(undefined);
    }

    private async decryptOwnEnvelope(envelope: MessageEnvelope, secretKey: CryptoSecretKey): Promise<MessageContentWrapper> {
        this.log.trace(`Decrypting own envelope with id ${envelope.id.toString()}...`);

        const plaintextMessageBuffer = await CoreCrypto.decrypt(envelope.cipher, secretKey);
        const signedMessage = MessageSigned.deserialize(plaintextMessageBuffer.toUtf8());
        const messagePlain = MessageContentWrapper.from(JSON.parse(signedMessage.message));

        return messagePlain;
    }

    @log()
    private async decryptPeerEnvelope(envelope: MessageEnvelope, relationship: Relationship): Promise<[MessageContentWrapper, CryptoSecretKey]> {
        const ownKeyCipher = envelope.recipients.find((r) => this.parent.identity.isMe(r.address))?.encryptedKey;

        if (!ownKeyCipher) {
            throw TransportCoreErrors.messages.ownAddressNotInList(envelope.id.toString());
        }

        const plaintextKeyBuffer = await this.secrets.decryptPeer(relationship.relationshipSecretId, ownKeyCipher, true);
        const plaintextKey = CryptoSecretKey.deserialize(plaintextKeyBuffer.toUtf8());
        const plaintextMessageBuffer = await CoreCrypto.decrypt(envelope.cipher, plaintextKey);

        const signedMessage = MessageSigned.deserialize(plaintextMessageBuffer.toUtf8());

        const signature = signedMessage.signatures.find((s) => this.parent.identity.isMe(s.recipient))?.signature;

        if (!signature) {
            throw TransportCoreErrors.messages.signatureListMismatch(envelope.id.toString());
        }

        const messagePlain = MessageContentWrapper.from(JSON.parse(signedMessage.message));
        if (signedMessage.signatures.length !== messagePlain.recipients.length) {
            this.log.debug(`Number of signatures does not match number of recipients from envelope ${envelope.id}.`);
        }

        const plainMessageBuffer = CoreBuffer.fromUtf8(signedMessage.message);
        const validSignature = await this.secrets.verifyPeer(relationship.relationshipSecretId, plainMessageBuffer, signature);
        if (!validSignature) {
            throw TransportCoreErrors.messages.signatureNotValid();
        }

        if (messagePlain.recipients.length !== envelope.recipients.length) {
            this.log.debug(`Number of signed recipients within the message does not match number of recipients from envelope ${envelope.id}.`);
        }

        if (messagePlain.recipients.length !== signedMessage.signatures.length) {
            this.log.debug(`Number of signed recipients within the message does not match number of signatures from envelope ${envelope.id}.`);
        }

        const recipientFound = messagePlain.recipients.some((r) => this.parent.identity.isMe(r));

        if (!recipientFound) {
            throw TransportCoreErrors.messages.plaintextMismatch(envelope.id.toString());
        }

        return [messagePlain, plaintextKey];
    }

    @log()
    private async decryptMessage(envelope: MessageEnvelope, secretKey?: CryptoSecretKey): Promise<[IBackboneMessageContents, CryptoSecretKey, Relationship?]> {
        this.log.trace(`Decrypting MessageEnvelope with id ${envelope.id}...`);
        let plainMessage: MessageContentWrapper;
        let messageKey: CryptoSecretKey;

        const recipients: MessageRecipient[] = [];

        let relationship;
        if (this.parent.identity.isMe(envelope.createdBy)) {
            if (!secretKey) {
                throw new TransportError(`The own message (${envelope.id.toString()}) could not be decrypted, because no secret key was passed for it.`);
            }
            messageKey = secretKey;
            plainMessage = await this.decryptOwnEnvelope(envelope, secretKey);

            const pseudonym = await IdentityUtil.createAddress({ algorithm: 1, publicKey: CoreBuffer.fromUtf8("deleted identity") }, new URL(this.parent.config.baseUrl).hostname);

            for (const recipient of envelope.recipients) {
                let relationship = await this.relationships.getRelationshipToIdentity(recipient.address);
                if (relationship?.status === RelationshipStatus.Rejected || relationship?.status === RelationshipStatus.Revoked) {
                    // if the relationship is rejected or revoked, it should be handled like there is no relationship
                    relationship = undefined;
                }

                recipients.push(
                    MessageRecipient.from({
                        // make sure to save the pseudonym instead of the real address if the relationship was removed
                        // in cases the Backbone did not already process the relationship termination
                        address: relationship ? recipient.address : pseudonym,
                        encryptedKey: recipient.encryptedKey,
                        receivedAt: recipient.receivedAt,
                        receivedByDevice: recipient.receivedByDevice,
                        relationshipId: relationship?.id
                    })
                );
            }
        } else {
            relationship = await this.relationships.getRelationshipToIdentity(envelope.createdBy);

            if (!relationship) {
                throw TransportCoreErrors.general.recordNotFound(Relationship, envelope.createdBy.toString());
            }

            const [peerMessage, peerKey] = await this.decryptPeerEnvelope(envelope, relationship);
            plainMessage = peerMessage;
            messageKey = peerKey;

            // we don't care about other recipients in the envelope, because we do not need them
            const currentIdentityAsRecipient = envelope.recipients.find((r) => this.parent.identity.isMe(r.address))!;
            recipients.push(
                MessageRecipient.from({
                    address: currentIdentityAsRecipient.address,
                    encryptedKey: currentIdentityAsRecipient.encryptedKey,
                    receivedAt: currentIdentityAsRecipient.receivedAt,
                    receivedByDevice: currentIdentityAsRecipient.receivedByDevice,
                    relationshipId: relationship.id
                })
            );
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

        const backboneData = {
            createdBy: envelope.createdBy,
            createdByDevice: envelope.createdByDevice,
            recipients,
            attachments: fileArray,
            content: plainMessage.content,
            createdAt: envelope.createdAt,
            receivedByEveryone: false
        };

        return [backboneData, messageKey, relationship];
    }
}
