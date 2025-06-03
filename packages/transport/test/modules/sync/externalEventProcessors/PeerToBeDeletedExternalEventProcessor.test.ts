import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { CoreDate, CoreId } from "@nmshd/core-types";
import { AccountController, PeerDeletionStatus, Transport } from "../../../../src";
import { PeerToBeDeletedExternalEventProcessor } from "../../../../src/modules/sync/externalEventProcessors/PeerToBeDeletedExternalEventProcessor";
import { TestUtil } from "../../../testHelpers/TestUtil";

describe("PeerToBeDeletedExternalEventProcessor", function () {
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

    test("PeerToBeDeletedExternalEventProcessor should mark peer as deleted", async function () {
        const eventProcessor = new PeerToBeDeletedExternalEventProcessor(recipient.identityDeletionProcess.eventBus, recipient);
        const deletionDate = CoreDate.local().add({ days: 14 });
        await eventProcessor.execute({
            id: "anId",
            createdAt: "aDate",
            index: 1,
            syncErrorCount: 0,
            type: "PeerToBeDeleted",
            payload: { relationshipId: relationshipId.toString(), deletionDate }
        });
        const relationship = await recipient.relationships.getRelationship(relationshipId);
        expect(relationship!.peerDeletionInfo!.deletionStatus).toBe(PeerDeletionStatus.ToBeDeleted);
        expect(relationship!.peerDeletionInfo!.deletionDate.isSame(deletionDate)).toBeTruthy();
    });
});
