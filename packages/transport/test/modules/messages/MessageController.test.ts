import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { CoreDate, CoreId } from "@nmshd/core-types";
import { AccountController, IdentityDeletionProcess, IdentityDeletionProcessStatus, Message, Relationship, RelationshipStatus, Transport } from "../../../src";
import { TestUtil } from "../../testHelpers/TestUtil";

describe("MessageController", function () {
    let connection: IDatabaseConnection;

    let transport: Transport;

    let sender: AccountController;
    let recipient: AccountController;
    let recipient2: AccountController;
    let recipient3: AccountController;
    let tempId1: CoreId;
    let tempId2: CoreId;
    let tempDate: CoreDate;
    let relationship: Relationship;
    let relationshipId: CoreId;
    let relationship2: Relationship;

    function expectValidMessages(sentMessage: Message, receivedMessage: Message, nowMinusSeconds: CoreDate) {
        expect(sentMessage.id.toString()).toBe(receivedMessage.id.toString());
        const sentRelIds = sentMessage.recipients.map((recipient) => recipient.relationshipId!.toString());
        const receivedRelIds = receivedMessage.recipients.map((recipient) => recipient.relationshipId?.toString());
        expect(sentRelIds).toContainEqual(receivedRelIds[0]);
        expect(sentMessage.createdBy.toString()).toBe(sender.identity.address.toString());
        expect(sentMessage.createdByDevice.toString()).toBe(sender.activeDevice.id.toString());
        expect(sentMessage.createdAt.isSameOrAfter(nowMinusSeconds)).toBe(true);
        expect(receivedMessage.createdBy.toString()).toBe(sender.identity.address.toString());
        expect(receivedMessage.createdByDevice.toString()).toBe(sender.activeDevice.id.toString());
        expect(receivedMessage.createdAt.isSameOrAfter(nowMinusSeconds)).toBe(true);
        expect(sentMessage.recipients.map((r) => r.toString())).toContainEqual(receivedMessage.recipients[0].toString());
        expect(sentMessage.attachments.map((r) => r.toString())).toStrictEqual(receivedMessage.attachments.map((r) => r.toString()));
        expect(sentMessage.receivedByEveryone).toBe(receivedMessage.receivedByEveryone);
        expect(sentMessage.content.serialize()).toBe(receivedMessage.content.serialize());
    }

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport();

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, connection, 4);
        sender = accounts[0];
        recipient = accounts[1];
        recipient2 = accounts[2];
        recipient3 = accounts[3];
    });

    afterAll(async function () {
        await sender.close();
        await recipient.close();
        await recipient2.close();
        await recipient3.close();
        await connection.close();
    });

    describe("Sending Messages requires existence of pending, active or terminated Relationship", function () {
        beforeEach(async () => {
            const relationshipBetweenSenderAndRecipient3 = await sender.relationships.getRelationshipToIdentity(recipient3.identity.address);

            if (relationshipBetweenSenderAndRecipient3?.status === RelationshipStatus.Pending) {
                await TestUtil.revokeRelationship(sender, recipient3);
            }
        });

        test("cannot send Message for non-existent Relationship", async function () {
            await expect(TestUtil.sendMessage(sender, recipient3)).rejects.toThrow("error.transport.messages.hasNeitherActiveNorTerminatedRelationship");
        });

        test("cannot send Message for rejected Relationship", async function () {
            const rejectedRelationship = await TestUtil.addRejectedRelationship(sender, recipient3);
            expect(rejectedRelationship.status).toBe("Rejected");

            await expect(TestUtil.sendMessage(sender, recipient3)).rejects.toThrow("error.transport.messages.hasNeitherActiveNorTerminatedRelationship");
        });

        test("cannot send Message for revoked Relationship", async function () {
            await TestUtil.addPendingRelationship(sender, recipient3);
            const revokedRelationship = (await TestUtil.revokeRelationship(sender, recipient3)).revokedRelationshipFromSelf;
            expect(revokedRelationship.status).toBe("Revoked");

            await expect(TestUtil.sendMessage(sender, recipient3)).rejects.toThrow("error.transport.messages.hasNeitherActiveNorTerminatedRelationship");
        });

        test("cannot send Message for Relationship whose deletion is proposed", async function () {
            await TestUtil.addRelationship(sender, recipient3);
            await TestUtil.terminateRelationship(recipient3, sender);
            const deletionProposedRelationship = await TestUtil.decomposeRelationship(recipient3, sender);
            expect(deletionProposedRelationship.status).toBe("DeletionProposed");

            await expect(TestUtil.sendMessage(sender, recipient3)).rejects.toThrow("error.transport.messages.hasNeitherActiveNorTerminatedRelationship");
        });
    });

    describe("Sending Messages for active Relationships", function () {
        beforeAll(async function () {
            relationship = (await TestUtil.addRelationship(sender, recipient)).acceptedRelationshipFromSelf;
            relationship2 = (await TestUtil.addRelationship(sender, recipient2)).acceptedRelationshipFromSelf;
            relationshipId = relationship.id;
        });

        test("should send and receive a Message", async function () {
            tempDate = CoreDate.utc().subtract(TestUtil.tempDateThreshold);
            const sentMessage = await TestUtil.sendMessage(sender, recipient);

            const receivedMessage = (await TestUtil.syncUntilHasMessage(recipient, sentMessage.id))[0];

            tempId1 = sentMessage.id;

            expectValidMessages(sentMessage, receivedMessage, tempDate);
        });

        test("should get the stored Message", async function () {
            const sentMessage = await sender.messages.getMessage(tempId1);
            const receivedMessage = await recipient.messages.getMessage(tempId1);
            expect(sentMessage).toBeDefined();
            expect(receivedMessage).toBeDefined();
            expectValidMessages(sentMessage!, receivedMessage!, tempDate);
        });

        test("should send and receive a second Message", async function () {
            tempDate = CoreDate.utc().subtract(TestUtil.tempDateThreshold);
            const sentMessage = await TestUtil.sendMessage(sender, recipient);

            const messages = await TestUtil.syncUntilHasMessages(recipient, 1);
            const receivedMessage = messages[0];
            tempId2 = sentMessage.id;

            expectValidMessages(sentMessage, receivedMessage, tempDate);
        });

        test("should send and receive a third Message", async function () {
            tempDate = CoreDate.utc().subtract(TestUtil.tempDateThreshold);
            const sentMessage = await TestUtil.sendMessage(sender, recipient);

            const messages = await TestUtil.syncUntilHasMessages(recipient, 1);
            const receivedMessage = messages[0];

            const relationship = await recipient.relationships.getRelationshipToIdentity(receivedMessage.createdBy);
            expectValidMessages(sentMessage, receivedMessage, tempDate);
            expect(receivedMessage.recipients[0].relationshipId!.toString()).toStrictEqual(relationship!.id.toString());
            expect(sentMessage.recipients[0].relationshipId!.toString()).toStrictEqual(relationship!.id.toString());
            expect(receivedMessage.recipients[0].receivedByDevice?.toString()).toBe(recipient.activeDevice.id.toString());
        });

        test("should get the stored messages", async function () {
            const sentMessages = await sender.messages.getMessages();
            const receivedMessages = await recipient.messages.getMessages();
            expect(sentMessages).toHaveLength(3);
            expect(receivedMessages).toHaveLength(3);
            expect(sentMessages[0].id.toString()).toBe(tempId1.toString());
            expect(sentMessages[1].id.toString()).toBe(tempId2.toString());
            expectValidMessages(sentMessages[0], receivedMessages[0], tempDate);
            expectValidMessages(sentMessages[1], receivedMessages[1], tempDate);
        });

        test("should set and get additional metadata", async function () {
            const creationTime = CoreDate.utc();
            await sender.messages.setMessageMetadata(tempId1, { myprop: true });

            const file = (await sender.messages.getMessage(tempId1))!;
            expect(file.metadata).toBeDefined();
            expect(file.metadata["myprop"]).toBe(true);
            expect(file.metadataModifiedAt).toBeDefined();
            expect(file.metadataModifiedAt!.isSameOrBefore(creationTime.add({ seconds: 1 }))).toBe(true);
            expect(file.metadataModifiedAt!.isSameOrAfter(creationTime.subtract({ seconds: 5 }))).toBe(true);
        });

        test("should get the messages by address (sender)", async function () {
            const messages = await sender.messages.getMessagesByAddress(recipient.identity.address);
            expect(messages).toHaveLength(3);
        });

        test("should get the messages by relationship (sender)", async function () {
            const messages = await sender.messages.getMessagesByRelationshipId(relationshipId);
            expect(messages).toHaveLength(3);
        });

        test("should get the messages by address (recipient)", async function () {
            const messages = await recipient.messages.getMessagesByAddress(sender.identity.address);
            expect(messages).toHaveLength(3);
        });

        test("should get the messages by relationship (recipient)", async function () {
            const messages = await recipient.messages.getMessagesByRelationshipId(relationshipId);
            expect(messages).toHaveLength(3);
        });

        test("should mark an unread message as read", async function () {
            await TestUtil.sendMessage(sender, recipient);
            const messages = await TestUtil.syncUntilHasMessages(recipient, 1);
            const message = messages[0];

            const timeBeforeRead = CoreDate.utc();
            const updatedMessage = await recipient.messages.markMessageAsRead(message.id);
            const timeAfterRead = CoreDate.utc();

            expect(updatedMessage.wasReadAt).toBeDefined();
            expect(updatedMessage.wasReadAt!.isSameOrAfter(timeBeforeRead)).toBe(true);
            expect(updatedMessage.wasReadAt!.isSameOrBefore(timeAfterRead)).toBe(true);
        });

        test("should not change wasReadAt of a read message", async function () {
            await TestUtil.sendMessage(sender, recipient);
            const messages = await TestUtil.syncUntilHasMessages(recipient, 1);
            const message = messages[0];

            const updatedMessage = await recipient.messages.markMessageAsRead(message.id);
            const firstReadAt = updatedMessage.wasReadAt;

            const unchangedMessage = await recipient.messages.markMessageAsRead(updatedMessage.id);
            expect(unchangedMessage.wasReadAt).toBeDefined();
            expect(unchangedMessage.wasReadAt!.equals(firstReadAt!)).toBe(true);
        });

        test("should mark a read message as unread", async function () {
            await TestUtil.sendMessage(sender, recipient);
            const messages = await TestUtil.syncUntilHasMessages(recipient, 1);
            const message = messages[0];

            const readMessage = await recipient.messages.markMessageAsRead(message.id);

            const unreadMessage = await recipient.messages.markMessageAsUnread(readMessage.id);
            expect(unreadMessage.wasReadAt).toBeUndefined();
        });

        test("should send and receive a Message (multiple recipients)", async function () {
            tempDate = CoreDate.utc().subtract(TestUtil.tempDateThreshold);
            const sentMessage = await TestUtil.sendMessage(sender, [recipient, recipient2]);

            const messages = await TestUtil.syncUntilHasMessages(recipient, 1);
            const receivedMessage = messages[0];

            const messages2 = await TestUtil.syncUntilHasMessages(recipient2, 1);
            const receivedMessage2 = messages2[0];

            tempId1 = sentMessage.id;

            expectValidMessages(sentMessage, receivedMessage, tempDate);
            expectValidMessages(sentMessage, receivedMessage2, tempDate);
        });

        test("should delete / pseudonymize messages", async function () {
            const multipleRecipientsMessage = await TestUtil.sendMessage(sender, [recipient, recipient2]);
            const message = await TestUtil.sendMessage(sender, recipient);
            await sender.messages.cleanupMessagesOfDecomposedRelationship(relationship);

            expect(await sender.messages.getMessage(message.id)).toBeUndefined();
            const pseudonymizedMessage = await sender.messages.getMessage(multipleRecipientsMessage.id);
            expect(pseudonymizedMessage).toBeDefined();
            expect(pseudonymizedMessage!.recipients.map((r) => [r.address, r.relationshipId])).toStrictEqual(
                expect.arrayContaining([
                    [await TestUtil.generateAddressPseudonym(process.env.NMSHD_TEST_BASEURL!), undefined],
                    [recipient2.identity.address, relationship2.id]
                ])
            );
        });
    });

    // TODO: even though the tests pass, they log errors: error.transport.secrets.wrongSecretType: 'The given secret type is not supported!'
    describe("Sending and decrypting Messages for pending Relationships", function () {
        let recipientWithPendingRelationship: AccountController;
        let pendingRelationship: Relationship;

        beforeAll(async function () {
            recipientWithPendingRelationship = (await TestUtil.provideAccounts(transport, connection, 1))[0];
            pendingRelationship = await TestUtil.addPendingRelationship(sender, recipientWithPendingRelationship);
        });

        afterAll(async () => await recipientWithPendingRelationship.close());

        test("should be able to send a Message on a pending Relationship", async function () {
            await expect(TestUtil.sendMessage(sender, recipientWithPendingRelationship)).resolves.not.toThrow();
        });

        test("should be able to receive a Message sent on a pending Relationship after the Relationship was activated", async function () {
            const idOfSentMessageDuringPendingRelationship = (await TestUtil.sendMessage(sender, recipientWithPendingRelationship)).id;

            await TestUtil.acceptPendingRelationship(sender, recipientWithPendingRelationship, pendingRelationship);

            const receivedMessages = await TestUtil.syncUntilHasMessages(recipientWithPendingRelationship);
            const idOfReceivedMessageAfterActivation = receivedMessages[receivedMessages.length - 1].id;
            expect(idOfReceivedMessageAfterActivation).toStrictEqual(idOfSentMessageDuringPendingRelationship);
        });
    });

    describe("Sending and decrypting Messages for terminated Relationships", function () {
        let messageExchangedBeforeTermination: Message;

        beforeAll(async function () {
            const message = await TestUtil.sendMessage(sender, recipient);
            await TestUtil.syncUntilHasMessage(recipient, message.id);
            messageExchangedBeforeTermination = message;

            await TestUtil.terminateRelationship(sender, recipient);
        });

        test("should be able to send a Message on a terminated Relationship", async function () {
            await expect(TestUtil.sendMessage(sender, recipient)).resolves.not.toThrow();
        });

        test("should decrypt a Message on a terminated Relationship", async function () {
            const messageId = messageExchangedBeforeTermination.id.toString();
            await expect(sender.messages.updateBackboneData([messageId])).resolves.not.toThrow();
            await expect(recipient.messages.updateBackboneData([messageId])).resolves.not.toThrow();
        });

        test("should be able to receive a Message sent on a terminated Relationship after the Relationship was reactivated", async function () {
            const idOfSentMessageDuringTerminatedRelationship = (await TestUtil.sendMessage(sender, recipient)).id;

            await TestUtil.reactivateRelationship(sender, recipient);

            const receivedMessages = await TestUtil.syncUntilHasMessages(recipient);
            const idOfReceivedMessageAfterReactivation = receivedMessages[receivedMessages.length - 1].id;
            expect(idOfReceivedMessageAfterReactivation).toStrictEqual(idOfSentMessageDuringTerminatedRelationship);
        });
    });

    describe("Recipient of the Message is in deletion", function () {
        let identityDeletionProcessOfRecipient: IdentityDeletionProcess;

        beforeEach(async function () {
            const approvedIdentityDeletionProcess = await recipient.identityDeletionProcess.getIdentityDeletionProcessByStatus(IdentityDeletionProcessStatus.Approved);
            if (!approvedIdentityDeletionProcess) {
                identityDeletionProcessOfRecipient = await recipient.identityDeletionProcess.initiateIdentityDeletionProcess();
                await TestUtil.syncUntilHasRelationships(sender);
            }
        });

        test("should be able to send a Message if the recipient is in deletion", async function () {
            await expect(TestUtil.sendMessage(sender, recipient)).resolves.not.toThrow();
        });

        test("should be able to receive a Message sent during its recipient was in deletion after the recipient cancelled its deletion process", async function () {
            const idOfSentMessageDuringRecipientInDeletion = (await TestUtil.sendMessage(sender, recipient)).id;

            await recipient.identityDeletionProcess.cancelIdentityDeletionProcess(identityDeletionProcessOfRecipient.id.toString());

            const receivedMessages = await TestUtil.syncUntilHasMessages(recipient);
            const idOfReceivedMessageAfterCancellation = receivedMessages[receivedMessages.length - 1].id;
            expect(idOfReceivedMessageAfterCancellation).toStrictEqual(idOfSentMessageDuringRecipientInDeletion);
        });
    });
});
