import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { CoreId } from "@nmshd/core-types";
import { AccountController, PeerDeletionCancelledExternalEventProcessor, Transport } from "@nmshd/transport";
import { TestUtil } from "../../../testHelpers/TestUtil.js";

describe("PeerDeletionCancelledExternalEventProcessor", function () {
    let connection: IDatabaseConnection;

    let transport: Transport;

    let sender: AccountController;
    let recipient: AccountController;

    let relationshipId: CoreId;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport();

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, connection, 2);
        sender = accounts[0];
        recipient = accounts[1];
        relationshipId = (await TestUtil.addRelationship(sender, recipient)).acceptedRelationshipFromSelf.id;
    });

    afterAll(async function () {
        await sender.close();
        await recipient.close();

        await connection.close();
    });

    test("PeerDeletionCancelledExternalEventProcessor should mark peer as deleted", async function () {
        const eventProcessor = new PeerDeletionCancelledExternalEventProcessor(recipient.identityDeletionProcess.eventBus, recipient);
        await eventProcessor.execute({
            id: "anId",
            createdAt: "aDate",
            index: 1,
            syncErrorCount: 0,
            type: "PeerDeletionCancelled",
            payload: { relationshipId: relationshipId.toString() }
        });
        const relationship = await recipient.relationships.getRelationship(relationshipId);
        expect(relationship!.peerDeletionInfo).toBeUndefined();
    });
});
