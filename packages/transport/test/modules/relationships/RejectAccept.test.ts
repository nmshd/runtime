import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { AccountController, Transport } from "@nmshd/transport";
import { TestUtil } from "../../testHelpers/TestUtil";

describe("Reject and accept relationship / send message", function () {
    let connection: IDatabaseConnection;

    let transport: Transport;

    let sender: AccountController;
    let recipient: AccountController;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport();

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, connection, 2);
        sender = accounts[0];
        recipient = accounts[1];

        await TestUtil.addRejectedRelationship(sender, recipient);
        await TestUtil.addRelationship(sender, recipient);
    });

    afterAll(async function () {
        await sender.close();
        await recipient.close();
        await connection.close();
    });

    test("should send a message", async function () {
        await TestUtil.sendMessage(sender, recipient);

        const messageList = await TestUtil.syncUntilHasMessages(recipient, 1);
        expect(messageList).toHaveLength(1);
    });
});
