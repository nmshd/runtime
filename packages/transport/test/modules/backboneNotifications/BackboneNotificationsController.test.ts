import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { AccountController, Transport } from "../../../src";
import { TestUtil } from "../../testHelpers/TestUtil";

describe("BackboneNotificationsController", function () {
    let connection: IDatabaseConnection;

    let transport: Transport;

    let sender: AccountController;
    let recipient: AccountController;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport();

        await transport.init();
    });

    afterAll(async () => await connection.close());

    beforeEach(async function () {
        const accounts = await TestUtil.provideAccounts(transport, connection, 2);
        sender = accounts[0];
        recipient = accounts[1];
    });

    afterEach(async function () {
        await sender.close();
        await recipient.close();
    });

    test("sendNotification", async function () {
        await TestUtil.addRelationship(sender, recipient);

        const address = recipient.identity.address.toString();
        const code = "TestCode";

        const result = await sender.notifications.sendNotification({ recipients: [address], code });
        expect(result).toBeUndefined();
    });

    describe("sendNotification errors", function () {
        test.each([
            [["recipient1"], "No active relationship found for recipients: recipient1"],
            [["recipient1", "recipient2"], "No active relationship found for recipients: recipient1, recipient2"],
            [[], "At least one recipient is required"]
        ])("invalid recipients: %s", async function (recipients, errorMessage) {
            await expect(sender.notifications.sendNotification({ recipients, code: "aCode" })).rejects.toThrow(errorMessage);
        });

        test("one valid and one invalid recipient", async function () {
            await TestUtil.addRelationship(sender, recipient);

            await expect(sender.notifications.sendNotification({ recipients: [recipient.identity.address.toString(), "invalidRecipientAddress"], code: "aCode" })).rejects.toThrow(
                "No active relationship found for recipients: invalidRecipientAddress"
            );
        });

        test.each([
            ["", "Code must not be empty"],
            ["aRandomCode", "The given message code does not exist."]
        ])("invalid codes: %s", async function (code, errorMessage) {
            await TestUtil.addRelationship(sender, recipient);

            await expect(sender.notifications.sendNotification({ recipients: [recipient.identity.address.toString()], code })).rejects.toThrow(errorMessage);
        });

        test("pending relationship", async function () {
            await TestUtil.addPendingRelationship(sender, recipient);

            await expect(sender.notifications.sendNotification({ recipients: [recipient.identity.address.toString()], code: "aCode" })).rejects.toThrow(
                "No active relationship found for recipients"
            );
        });
    });
});
