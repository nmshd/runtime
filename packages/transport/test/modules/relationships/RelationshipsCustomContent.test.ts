import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { JSONWrapper, Serializable } from "@js-soft/ts-serval";
import { AccountController, Transport } from "../../../src";
import { TestUtil } from "../../testHelpers/TestUtil";

describe("Relationships Custom Content", function () {
    let connection: IDatabaseConnection;

    let transport: Transport;

    let sender: AccountController;
    let recipient: AccountController;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport(connection);

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, 2);
        sender = accounts[0];
        recipient = accounts[1];
    });

    afterAll(async function () {
        await sender.close();
        await recipient.close();

        await connection.close();
    });
    test("should create a relationship with custom content", async function () {
        const tokenReference = await TestUtil.sendRelationshipTemplateAndToken(sender);
        const template = await TestUtil.fetchRelationshipTemplateFromTokenReference(recipient, tokenReference);
        const customContent = Serializable.fromAny({ content: "TestToken" });
        const relRecipient = await TestUtil.sendRelationship(recipient, template, customContent);
        const relRecipientContent = relRecipient.cache!.creationContent;

        const relSender = await TestUtil.syncUntilHasRelationships(sender);
        const relSenderRequest = relSender[0].cache!.creationContent;

        expect(relRecipientContent).toBeInstanceOf(JSONWrapper);
        const recipientToken = relRecipientContent as JSONWrapper;
        expect(relSenderRequest).toBeInstanceOf(JSONWrapper);
        const senderToken = relSenderRequest as JSONWrapper;

        expect((recipientToken.toJSON() as any).content).toBe("TestToken");
        expect((senderToken.toJSON() as any).content).toBe("TestToken");
    });
});
