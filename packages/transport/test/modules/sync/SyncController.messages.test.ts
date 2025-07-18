import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { TestUtil } from "../../testHelpers/TestUtil";

describe("MessageSync", function () {
    let connection: IDatabaseConnection;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
    });

    afterAll(async () => {
        await connection.close();
    });

    test("default case A1 -> B1: sync should receive message on main device", async function () {
        const a1 = await TestUtil.createIdentityWithOneDevice(connection, { datawalletEnabled: true });
        const b1 = await TestUtil.createIdentityWithOneDevice(connection, { datawalletEnabled: true });

        await TestUtil.addRelationship(a1, b1);

        const a1Message = await TestUtil.sendMessage(a1, b1);

        await TestUtil.syncUntilHasMessages(b1);

        const b1Messages = await b1.messages.getMessages();
        expect(b1Messages[0].toJSON()).toStrictEqualExcluding(a1Message.toJSON(), "isOwn", "recipients[0].receivedAt", "recipients[0].receivedByDevice");
    });

    test("default case A1 -> B2: sync should receive message on an onboarded device", async function () {
        const a1 = await TestUtil.createIdentityWithOneDevice(connection, { datawalletEnabled: true });
        const { device1: b1, device2: b2 } = await TestUtil.createIdentityWithTwoDevices(connection, { datawalletEnabled: true });

        await TestUtil.addRelationship(a1, b1);

        const a1Message = await TestUtil.sendMessage(a1, b1);

        await TestUtil.syncUntilHasMessages(b2);

        const b2Messages = await b2.messages.getMessages();

        expect(b2Messages[0].toJSON()).toStrictEqualExcluding(a1Message.toJSON(), "isOwn", "recipients[0].receivedAt", "recipients[0].receivedByDevice");
    });

    test("default case A2 -> B1: an onboarded device should be able to send messages", async function () {
        const { device1: a1, device2: a2 } = await TestUtil.createIdentityWithTwoDevices(connection, { datawalletEnabled: true });
        const b1 = await TestUtil.createIdentityWithOneDevice(connection, { datawalletEnabled: true });

        await TestUtil.addRelationship(a1, b1);
        await a2.syncDatawallet();

        const a2Message = await TestUtil.sendMessage(a2, b1);

        await TestUtil.syncUntilHasMessages(b1);

        const b1Messages = await b1.messages.getMessages();
        expect(b1Messages[0].toJSON()).toStrictEqualExcluding(a2Message.toJSON() as any, "isOwn", "recipients[0].receivedAt", "recipients[0].receivedByDevice");
    });

    test("concurrent send A1 -> B1, A2 -> B1: sync should receive messages sent parallel to the same identity on all devices", async function () {
        const { device1: a1, device2: a2 } = await TestUtil.createIdentityWithTwoDevices(connection, { datawalletEnabled: true });
        const { device1: b1, device2: b2 } = await TestUtil.createIdentityWithTwoDevices(connection, { datawalletEnabled: true });

        await TestUtil.addRelationship(a1, b1);
        await a2.syncEverything();
        await b2.syncEverything();

        // A1 and A2 both send a message to B
        const sendPromises = [TestUtil.sendMessage(a1, b1), TestUtil.sendMessage(a2, b1)];
        const sentMessages = await Promise.all(sendPromises);
        const a1SentMessage = sentMessages[0];
        const a2SentMessage = sentMessages[1];

        // B1 fetches both messages
        await TestUtil.syncUntilHasMessages(b1, 2);

        const b1MessageFromA1 = await b1.messages.getMessage(a1SentMessage.id);
        const b1MessageFromA2 = await b1.messages.getMessage(a2SentMessage.id);

        expect(b1MessageFromA1).toBeDefined();
        expect(b1MessageFromA2).toBeDefined();

        expect(b1MessageFromA1!.toJSON()).toStrictEqualExcluding(a1SentMessage.toJSON() as any, "isOwn", "recipients[0].receivedAt", "recipients[0].receivedByDevice");

        expect(b1MessageFromA2!.toJSON()).toStrictEqualExcluding(a2SentMessage.toJSON() as any, "isOwn", "recipients[0].receivedAt", "recipients[0].receivedByDevice");

        // B2 syncs its datawallet
        await b2.syncDatawallet();
        const b2MessageFromA1 = await b1.messages.getMessage(a1SentMessage.id);
        const b2MessageFromA2 = await b1.messages.getMessage(a2SentMessage.id);

        expect(b2MessageFromA1).toBeDefined();
        expect(b2MessageFromA2).toBeDefined();

        expect(b2MessageFromA1!.toJSON()).toStrictEqualExcluding(a1SentMessage.toJSON() as any, "isOwn", "recipients[0].receivedAt", "recipients[0].receivedByDevice");

        expect(b2MessageFromA2!.toJSON()).toStrictEqualExcluding(a2SentMessage.toJSON() as any, "isOwn", "recipients[0].receivedAt", "recipients[0].receivedByDevice");
    });

    test("concurrent receive A1 -> B1, A2 -> B1: only one active sync run is allowed", async function () {
        const { device1: a1, device2: a2 } = await TestUtil.createIdentityWithTwoDevices(connection, {
            datawalletEnabled: true
        });
        const { device1: b1, device2: b2 } = await TestUtil.createIdentityWithTwoDevices(connection, {
            datawalletEnabled: true
        });

        await TestUtil.addRelationship(a1, b1);
        await a2.syncEverything();
        await b2.syncEverything();

        // A1 and A2 both send a message to B
        const sendPromises = [TestUtil.sendMessage(a1, b1), TestUtil.sendMessage(a2, b1)];
        const sentMessages = await Promise.all(sendPromises);
        const a1SentMessage = sentMessages[0];
        const a2SentMessage = sentMessages[1];

        // A1 pushes its message to the datawallet
        await a1.syncDatawallet();

        // A2 synchronizes the message of A1 to its local datawallet
        // and pushes its own message to the datawallet
        await a2.syncDatawallet();

        // A1 synchronizes the message of A2 to its local datawallet
        await a1.syncDatawallet();

        // B1 receives both messages
        await TestUtil.syncUntilHasMessages(b1, 2);
        const b1MessageFromA1 = await b1.messages.getMessage(a1SentMessage.id);
        const b1MessageFromA2 = await b1.messages.getMessage(a2SentMessage.id);

        expect(b1MessageFromA1).toBeDefined();
        expect(b1MessageFromA2).toBeDefined();

        expect(b1MessageFromA1!.toJSON()).toStrictEqualExcluding(a1SentMessage.toJSON() as any, "isOwn", "recipients[0].receivedAt", "recipients[0].receivedByDevice");
        expect(b1MessageFromA2!.toJSON()).toStrictEqualExcluding(a2SentMessage.toJSON() as any, "isOwn", "recipients[0].receivedAt", "recipients[0].receivedByDevice");

        // B2 synchronizes the received messages to its local datawallet
        await b2.syncDatawallet();

        const b2MessageFromA1 = await b2.messages.getMessage(a1SentMessage.id);
        const b2MessageFromA2 = await b2.messages.getMessage(a2SentMessage.id);

        expect(b2MessageFromA1).toBeDefined();
        expect(b2MessageFromA2).toBeDefined();

        expect(b2MessageFromA1!.toJSON()).toStrictEqual(b1MessageFromA1!.toJSON());

        expect(b2MessageFromA2!.toJSON()).toStrictEqual(b1MessageFromA2!.toJSON());

        // A1 receives the updated messages (receivedAt dates were set)
        // MessageDelivered external events are not sent
        // await TestUtil.syncUntilHasMessages(a1, 2)

        await a1.messages.updateBackboneData([a1SentMessage.id.toString(), a2SentMessage.id.toString()]);
        await a1.syncDatawallet();

        const a1MessageFromA1 = await a1.messages.getMessage(a1SentMessage.id);
        const a1MessageFromA2 = await a1.messages.getMessage(a2SentMessage.id);

        expect(a1MessageFromA1).toBeDefined();
        expect(a1MessageFromA2).toBeDefined();

        expect(a1MessageFromA1!.recipients[0].receivedAt).toBeDefined();
        expect(a1MessageFromA2!.recipients[0].receivedAt).toBeDefined();

        // A2 receives the modifications
        await a2.syncDatawallet();

        const a2MessageFromA1 = await a2.messages.getMessage(a1SentMessage.id);
        const a2MessageFromA2 = await a2.messages.getMessage(a2SentMessage.id);

        expect(a2MessageFromA1).toBeDefined();
        expect(a2MessageFromA2).toBeDefined();

        expect(a2MessageFromA1!.recipients[0].receivedAt).toBeDefined();
        expect(a2MessageFromA2!.recipients[0].receivedAt).toBeDefined();
    });

    test("syncDatawallet should sync sent messages", async function () {
        const recipient = await TestUtil.createIdentityWithOneDevice(connection, { datawalletEnabled: true });

        const { device1: senderDevice1, device2: senderDevice2 } = await TestUtil.createIdentityWithTwoDevices(connection, { datawalletEnabled: true });

        await TestUtil.addRelationship(recipient, senderDevice1);

        const messageOnDevice1 = await senderDevice1.messages.sendMessage({
            recipients: [recipient.identity.address],
            content: { someMessageContent: "someMessageContent" }
        });
        await senderDevice1.syncDatawallet();

        let messageOnDevice2 = await senderDevice2.messages.getMessage(messageOnDevice1.id);
        expect(messageOnDevice2).toBeUndefined();
        await senderDevice2.syncDatawallet();

        messageOnDevice2 = await senderDevice2.messages.getMessage(messageOnDevice1.id);
        expect(messageOnDevice2!.toJSON()).toStrictEqual(messageOnDevice1.toJSON());
    });
});
