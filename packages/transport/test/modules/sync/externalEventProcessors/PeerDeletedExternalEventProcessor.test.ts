import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { CoreDate, CoreId } from "@nmshd/core-types";
import { AccountController, PeerDeletedExternalEventProcessor, PeerDeletionStatus, Transport } from "@nmshd/transport";
import { TestUtil } from "../../../testHelpers/TestUtil.js";

describe("PeerDeletedExternalEventProcessor", function () {
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

    test("PeerDeletedExternalEventProcessor should mark peer as deleted", async function () {
        const eventProcessor = new PeerDeletedExternalEventProcessor(recipient.identityDeletionProcess.eventBus, recipient);
        const deletionDate = CoreDate.local();
        await eventProcessor.execute({
            id: "anId",
            createdAt: "aDate",
            index: 1,
            syncErrorCount: 0,
            type: "PeerDeleted",
            payload: { relationshipId: relationshipId.toString(), deletionDate }
        });
        const relationship = await recipient.relationships.getRelationship(relationshipId);
        expect(relationship!.peerDeletionInfo!.deletionStatus).toBe(PeerDeletionStatus.Deleted);
        expect(relationship!.peerDeletionInfo!.deletionDate.isSame(deletionDate)).toBeTruthy();
    });
});
