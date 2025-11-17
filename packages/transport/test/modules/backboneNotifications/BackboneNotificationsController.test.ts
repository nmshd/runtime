import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { AccountController, Transport } from "@nmshd/transport";
import { TestUtil } from "../../testHelpers/TestUtil.js";

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

        const result = await sender.backboneNotifications.sendNotification({ recipients: [address], code });
        expect(result).toBeUndefined();
    });

    describe("sendNotification errors", function () {
        test.each([
            [["recipient1"], "error.transport.backboneNotifications.noActiveRelationshipFoundForRecipients"],
            [["recipient1", "recipient2"], "error.transport.backboneNotifications.noActiveRelationshipFoundForRecipients"],
            [[], "error.transport.backboneNotifications.atLeastOneRecipientRequired"]
        ])("invalid recipients: %s", async function (recipients, errorMessage) {
            await expect(sender.backboneNotifications.sendNotification({ recipients, code: "aCode" })).rejects.toThrow(errorMessage);
        });

        test("one valid and one invalid recipient", async function () {
            await TestUtil.addRelationship(sender, recipient);

            const input = { recipients: [recipient.identity.address.toString(), "invalidRecipientAddress"], code: "aCode" };
            await expect(sender.backboneNotifications.sendNotification(input)).rejects.toThrow("error.transport.backboneNotifications.noActiveRelationshipFoundForRecipients");
        });

        test.each([
            ["", "error.transport.backboneNotifications.codeMustNotBeEmpty"],
            ["aRandomCode", "error.platform.validation.notification.codeDoesNotExist"]
        ])("invalid codes: %s", async function (code, errorMessage) {
            await TestUtil.addRelationship(sender, recipient);

            await expect(sender.backboneNotifications.sendNotification({ recipients: [recipient.identity.address.toString()], code })).rejects.toThrow(errorMessage);
        });

        test("pending relationship", async function () {
            await TestUtil.addPendingRelationship(sender, recipient);

            const input = { recipients: [recipient.identity.address.toString()], code: "aCode" };
            await expect(sender.backboneNotifications.sendNotification(input)).rejects.toThrow("error.transport.backboneNotifications.noActiveRelationshipFoundForRecipients");
        });
    });
});
