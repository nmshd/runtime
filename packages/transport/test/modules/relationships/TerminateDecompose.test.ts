import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { AccountController, CoreId, RelationshipChangedEvent, Transport } from "../../../src";
import { TestUtil } from "../../testHelpers/TestUtil";

describe("Terminate and Decompose simultaneously", function () {
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

        const relationships = await TestUtil.addRelationship(sender, recipient);
        relationshipId = relationships.acceptedRelationshipFromSelf.id;
    });

    afterAll(async function () {
        await sender.close();
        await recipient.close();
        await connection.close();
    });

    test("should only get one RelationshipChangedEvent for Terminate and Decompose at the same time", async function () {
        await sender.relationships.terminate(relationshipId);
        await sender.relationships.decompose(relationshipId);

        const events: RelationshipChangedEvent[] = [];
        transport.eventBus.subscribe(RelationshipChangedEvent, function (event) {
            events.push(event);
        });

        await TestUtil.syncUntilHasRelationships(recipient);

        expect(events).toHaveLength(1);
    });
});
