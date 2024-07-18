import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { AccountController, CoreDate, CoreId, Message, Transport } from "../../../src";
import { TestUtil } from "../../testHelpers/TestUtil";

describe("MessageController", function () {
    let connection: IDatabaseConnection;

    let transport: Transport;

    let sender: AccountController;
    let recipient: AccountController;
    let recipient2: AccountController;
    let tempId1: CoreId;
    let tempId2: CoreId;
    let tempDate: CoreDate;
    let relationshipId: CoreId;

    function expectValidMessages(sentMessage: Message, receivedMessage: Message, nowMinusSeconds: CoreDate) {
        expect(sentMessage.id.toString()).toBe(receivedMessage.id.toString());
        const sentRelIds = sentMessage.cache!.recipients.map((recipient) => recipient.relationshipId!.toString());
        const receivedRelIds = receivedMessage.cache!.recipients.map((recipient) => recipient.relationshipId?.toString());
        expect(sentRelIds).toContainEqual(receivedRelIds[0]);
        expect(sentMessage.cache).toBeDefined();
        expect(sentMessage.cachedAt?.isSameOrAfter(nowMinusSeconds)).toBe(true);
        expect(sentMessage.cache?.createdBy.toString()).toBe(sender.identity.address.toString());
        expect(sentMessage.cache?.createdByDevice.toString()).toBe(sender.activeDevice.id.toString());
        expect(sentMessage.cache?.createdAt.isSameOrAfter(nowMinusSeconds)).toBe(true);
        expect(receivedMessage.cache).toBeDefined();
        expect(receivedMessage.cachedAt?.isSameOrAfter(nowMinusSeconds)).toBe(true);
        expect(receivedMessage.cache?.createdBy.toString()).toBe(sender.identity.address.toString());
        expect(receivedMessage.cache?.createdByDevice.toString()).toBe(sender.activeDevice.id.toString());
        expect(receivedMessage.cache?.createdAt.isSameOrAfter(nowMinusSeconds)).toBe(true);
        expect(sentMessage.cache!.recipients.map((r) => r.toString())).toContainEqual(receivedMessage.cache!.recipients[0].toString());
        expect(sentMessage.cache!.attachments.map((r) => r.toString())).toStrictEqual(receivedMessage.cache!.attachments.map((r) => r.toString()));
        expect(sentMessage.cache!.receivedByEveryone).toBe(receivedMessage.cache!.receivedByEveryone);
        expect(sentMessage.cache!.content.serialize()).toBe(receivedMessage.cache!.content.serialize());
    }

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport(connection);

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, 3);
        sender = accounts[0];
        recipient = accounts[1];
        recipient2 = accounts[2];
        const rels = await TestUtil.addRelationship(sender, recipient);
        await TestUtil.addRelationship(sender, recipient2);
        relationshipId = rels.acceptedRelationshipFromSelf.id;
    });

    afterAll(async function () {
        await sender.close();
        await recipient.close();
        await connection.close();
    });

    test("should send and receive a Message", async function () {
        tempDate = CoreDate.utc().subtract(TestUtil.tempDateThreshold);
        const sentMessage = await TestUtil.sendMessage(sender, recipient);

        const messages = await TestUtil.syncUntilHasMessages(recipient, 1);
        const receivedMessage = messages[0];

        tempId1 = sentMessage.id;

        expectValidMessages(sentMessage, receivedMessage, tempDate);
    });

    test("should get the cached Message", async function () {
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

        const relationship = await recipient.relationships.getRelationshipToIdentity(receivedMessage.cache!.createdBy);
        expectValidMessages(sentMessage, receivedMessage, tempDate);
        expect(receivedMessage.cache!.recipients[0].relationshipId!.toString()).toStrictEqual(relationship!.id.toString());
        expect(sentMessage.cache!.recipients[0].relationshipId!.toString()).toStrictEqual(relationship!.id.toString());
        expect(receivedMessage.cache!.recipients[0].receivedByDevice?.toString()).toBe(recipient.activeDevice.id.toString());
    });

    test("should get the cached messages", async function () {
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

    describe("Relationship Termination", function () {
        beforeAll(async function () {
            await TestUtil.terminateRelationship(sender, recipient);
        });

        test("should not send a message on a terminated relationship", async function () {
            await expect(TestUtil.sendMessage(sender, recipient)).rejects.toThrow("error.transport.messages.missingOrInactiveRelationship");
        });
    });
});
