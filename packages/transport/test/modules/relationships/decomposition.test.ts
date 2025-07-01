import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { Serializable } from "@js-soft/ts-serval";
import { CoreDate, CoreId } from "@nmshd/core-types";
import { AccountController, Relationship, RelationshipStatus, Transport } from "../../../src";
import { TestUtil } from "../../testHelpers/TestUtil";

describe("Data cleanup after relationship decomposition", function () {
    let connection: IDatabaseConnection;

    let transport: Transport;

    let sender: AccountController;
    let recipient1: AccountController;
    let recipient2: AccountController;

    let relationship: Relationship;
    let relationship2Id: CoreId;

    let tokenId: CoreId;
    let templateId: CoreId;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport();

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, connection, 3);
        sender = accounts[0];
        recipient1 = accounts[1];
        recipient2 = accounts[2];

        relationship = (await TestUtil.addRelationship(sender, recipient1)).acceptedRelationshipFromSelf;
        relationship2Id = (await TestUtil.addRelationship(sender, recipient2)).acceptedRelationshipFromSelf.id;

        await TestUtil.sendMessage(sender, [recipient1, recipient2]);
        await TestUtil.syncUntilHasMessages(recipient1);

        // generate another template not used for a relationship
        const tokenReference = await TestUtil.sendRelationshipTemplateAndToken(recipient1);
        templateId = (await TestUtil.fetchRelationshipTemplateFromTokenReference(sender, tokenReference)).id;

        const expiresAt = CoreDate.utc().add({ minutes: 5 });
        const content = Serializable.fromAny({ content: "TestToken" });
        const sentToken = await recipient1.tokens.sendToken({
            content,
            expiresAt,
            ephemeral: false
        });
        const reference = sentToken.toTokenReference(sender.config.baseUrl);
        tokenId = (await sender.tokens.loadPeerTokenByReference(reference, false)).id;

        await TestUtil.terminateRelationship(sender, recipient1);
        await TestUtil.decomposeRelationship(sender, recipient1);
    });

    afterAll(async function () {
        await sender.close();
        await recipient1.close();
        await recipient2.close();
        await connection.close();
    });

    test("templates should be deleted", async function () {
        const templateForRelationship = await sender.relationshipTemplates.getRelationshipTemplate(relationship.cache!.template.id);
        const otherTemplate = await sender.relationshipTemplates.getRelationshipTemplate(templateId);
        expect(templateForRelationship).toBeUndefined();
        expect(otherTemplate).toBeUndefined();
    });

    test("token should be deleted", async function () {
        const token = await sender.tokens.getToken(tokenId);
        expect(token).toBeUndefined();
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

        const accounts = await TestUtil.provideAccounts(transport, connection, 2);
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

describe("Relationship decomposition due to Identity deletion", function () {
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

        await TestUtil.addRelationship(sender, recipient);
    });

    afterAll(async function () {
        await sender.close();
        await recipient.close();
        await connection.close();
    });

    test("status of a previously active Relationship should be set to 'DeletionProposed' after the peer is deleted", async function () {
        const activeRelationship = await sender.relationships.getActiveRelationshipToIdentity(recipient.identity.address);
        expect(activeRelationship!.status).toBe(RelationshipStatus.Active);

        await recipient.identityDeletionProcess.initiateIdentityDeletionProcess(0);
        await TestUtil.runDeletionJob();

        await sender.syncEverything();
        const deletionProposedRelationship = await sender.relationships.getRelationshipToIdentity(recipient.identity.address);
        expect(deletionProposedRelationship!.status).toBe(RelationshipStatus.DeletionProposed);
    });
});
