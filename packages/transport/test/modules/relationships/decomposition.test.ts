import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { AccountController, CoreId, Transport } from "../../../src";
import { TestUtil } from "../../testHelpers/TestUtil";

describe("Relationship Decomposition", function () {
    let connection: IDatabaseConnection;

    let transport: Transport;

    let sender: AccountController;
    let recipient1: AccountController;

    let relationship2Id: CoreId;
    let recipient2: AccountController;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport(connection);

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, 3);
        sender = accounts[0];
        recipient1 = accounts[1];
        recipient2 = accounts[2];

        await TestUtil.addRelationship(sender, recipient1);
        relationship2Id = (await TestUtil.addRelationship(sender, recipient2)).acceptedRelationshipFromSelf.id;

        await TestUtil.sendMessage(sender, [recipient1, recipient2]);

        await TestUtil.syncUntilHasMessages(recipient1);
        await TestUtil.terminateRelationship(sender, recipient1);
        await TestUtil.decomposeRelationship(sender, recipient1);
    });

    afterAll(async function () {
        await sender.close();
        await recipient1.close();
        await recipient2.close();
        await connection.close();
    });

    test("messages should be deleted/pseudonymized", async function () {
        const messages = await sender.messages.getMessages();
        expect(messages).toHaveLength(1);

        expect(messages[0].cache!.recipients.map((r) => [r.address, r.relationshipId])).toStrictEqual(
            expect.arrayContaining([
                [await TestUtil.generateAddressPseudonym(process.env.NMSHD_TEST_BASEURL!), undefined],
                [recipient2.identity.address, relationship2Id]
            ])
        );
    });

    test("should sync the pseudonymization", async function () {
        const { device1: sender1, device2: sender2 } = await TestUtil.createIdentityWithTwoDevices(connection, {
            datawalletEnabled: true
        });

        const accounts = await TestUtil.provideAccounts(transport, 2);
        const recipient1 = accounts[0];
        const recipient2 = accounts[1];

        await TestUtil.addRelationship(sender1, recipient1);
        const relationship2Id = (await TestUtil.addRelationship(sender1, recipient2)).acceptedRelationshipPeer.id;

        await sender2.syncDatawallet();
        await TestUtil.sendMessage(sender1, [recipient1, recipient2]);

        await sender1.syncDatawallet();
        await sender2.syncDatawallet();

        await TestUtil.terminateRelationship(sender1, recipient1);
        await TestUtil.decomposeRelationship(sender1, recipient1);

        await sender1.syncDatawallet();
        await sender2.syncDatawallet();

        const sender2Messages = await sender2.messages.getMessages();
        expect(sender2Messages[0].cache?.recipients.map((r) => [r.address, r.relationshipId])).toStrictEqual(
            expect.arrayContaining([
                [await TestUtil.generateAddressPseudonym(process.env.NMSHD_TEST_BASEURL!), undefined],
                [recipient2.identity.address, relationship2Id]
            ])
        );
    });
});
