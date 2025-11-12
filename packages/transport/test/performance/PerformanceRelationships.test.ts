import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { AccountController, Transport } from "@nmshd/transport";
import { TestUtil } from "../testHelpers/TestUtil";

describe("List Relationship Messages", function () {
    let connection: IDatabaseConnection;

    let transport: Transport;
    let recipient: AccountController;
    let sender1: AccountController;
    let sender2: AccountController;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport();

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, connection, 3);

        recipient = accounts[0];
        sender1 = accounts[1];
        sender2 = accounts[2];

        await TestUtil.addRelationship(recipient, sender1);
        await TestUtil.addRelationship(recipient, sender2);

        await TestUtil.sendMessage(sender1, recipient);
        await TestUtil.sendMessage(sender2, recipient);
    });

    afterAll(async function () {
        await recipient.close();
        await sender1.close();
        await sender2.close();
        await connection.close();
    });

    test("should sync messages over all relationships", async function () {
        const messageList = await TestUtil.syncUntilHasMessages(recipient);
        expect(messageList).toHaveLength(2);

        const messageListDb = await recipient.messages.getMessages();
        expect(messageListDb).toHaveLength(2);
    });

    test("should list messages over all relationships", async function () {
        const messageList = await recipient.messages.getReceivedMessages();
        expect(messageList).toHaveLength(2);
    });

    test("sender messages should be 0", async function () {
        const messageList = await sender1.messages.getReceivedMessages();
        expect(messageList).toHaveLength(0);
    });
});
