import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { AccountController, CoreDate, CoreId, Message, Transport } from "../../../src";
import { TestUtil } from "../../testHelpers/TestUtil";

describe("MessageController", function () {
    let connection: IDatabaseConnection;

    let transport: Transport;

    let sender: AccountController;
    let recipient: AccountController;
    let tempId1: CoreId;
    let tempId2: CoreId;
    let tempDate: CoreDate;
    let relationshipId: CoreId;

    function expectValidMessages(sentMessage: Message, receivedMessage: Message, nowMinusSeconds: CoreDate) {
        expect(sentMessage.id.toString()).toBe(receivedMessage.id.toString());
        const sentRelIds = sentMessage.relationshipIds.map((id) => id.toString());
        const receivedRelIds = receivedMessage.relationshipIds.map((id) => id.toString());
        expect(sentRelIds.join()).toBe(receivedRelIds.join());
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
        expect(sentMessage.cache!.recipients.map((r) => r.toString())).toStrictEqual(receivedMessage.cache!.recipients.map((r) => r.toString()));
        expect(sentMessage.cache!.attachments.map((r) => r.toString())).toStrictEqual(receivedMessage.cache!.attachments.map((r) => r.toString()));
        expect(sentMessage.cache!.receivedByEveryone).toBe(receivedMessage.cache!.receivedByEveryone);
        expect(sentMessage.cache!.content.serialize()).toBe(receivedMessage.cache!.content.serialize());
    }

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport(connection);

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, 2);
        sender = accounts[0];
        recipient = accounts[1];
        const rels = await TestUtil.addRelationship(sender, recipient);
        relationshipId = rels[0].id;
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
        expect(receivedMessage.relationshipIds[0].toString()).toStrictEqual(relationship!.id.toString());
        expect(sentMessage.relationshipIds[0].toString()).toStrictEqual(relationship!.id.toString());
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
        const receivedMessage = await recipient.messages.getMessage(tempId1);
        const timeBeforeRead = CoreDate.utc();
        await recipient.messages.markMessageAsRead(receivedMessage!.id);
        const timeAfterRead = CoreDate.utc();

        const updatedMessage = await recipient.messages.getMessage(tempId1);
        expect(updatedMessage?.readAt).toBeDefined();
        expect(updatedMessage!.readAt!.isBetween(timeBeforeRead, timeAfterRead)).toBe(true);
    });

    test("should not change readAt of a read message", async function () {
        const receivedMessage = await recipient.messages.getMessage(tempId1);
        await recipient.messages.markMessageAsRead(receivedMessage!.id);

        const readMessage = await recipient.messages.getMessage(tempId1);
        const firstReadAt = readMessage!.readAt!;
        await recipient.messages.markMessageAsRead(readMessage!.id);

        const updatedMessage = await recipient.messages.getMessage(tempId1);
        expect(updatedMessage?.readAt).toBeDefined();
        expect(updatedMessage!.readAt!.equals(firstReadAt)).toBe(true);
    });

    test("should mark a read message as unread", async function () {
        const receivedMessage = await recipient.messages.getMessage(tempId1);
        await recipient.messages.markMessageAsRead(receivedMessage!.id);

        const readMessage = await recipient.messages.getMessage(tempId1);
        await recipient.messages.markMessageAsUnread(readMessage!.id);

        const updatedMessage = await recipient.messages.getMessage(tempId1);
        expect(updatedMessage?.readAt).toBeUndefined();
    });
});
