import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { AccountController, CoreId, PeerDeletionStatus, Transport } from "../../../src";
import { PeerDeletedEventProcessor } from "../../../src/modules/sync/externalEventProcessors";
import { TestUtil } from "../../testHelpers/TestUtil";

describe("RelationshipTemplateController", function () {
    let connection: IDatabaseConnection;

    let transport: Transport;

    let sender: AccountController;
    let recipient: AccountController;

    let relationshipId: CoreId;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport(connection);

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, 2);
        sender = accounts[0];
        recipient = accounts[1];
        relationshipId = (await TestUtil.addRelationship(sender, recipient)).acceptedRelationshipFromSelf.id;
    });

    afterAll(async function () {
        await sender.close();
        await recipient.close();

        await connection.close();
    });

    test("PeerDeletedEventProcessor should mark peer as deleted", async function () {
        const eventProcessor = new PeerDeletedEventProcessor(recipient.identityDeletionProcess.eventBus, recipient);
        await eventProcessor.execute({ id: "anId", createdAt: "aDate", index: 1, syncErrorCount: 0, type: "PeerDeleted", payload: { relationshipId: relationshipId.toString() } });
        const relationship = await recipient.relationships.getRelationship(relationshipId);
        expect(relationship!.peerDeletionInfo!.deletionStatus).toBe(PeerDeletionStatus.Deleted);
    });
});
