import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { CoreDate } from "@nmshd/core-types";
import { AccountController, Transport } from "../../../src";
import { TestUtil } from "../../testHelpers/TestUtil";

describe("SyncController.ordered", function () {
    let connection: IDatabaseConnection;
    let transport: Transport;

    let sender: AccountController | undefined;
    let recipient: AccountController | undefined;
    let recipientSecondDevice: AccountController | undefined;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();

        transport = TestUtil.createTransport(connection, { datawalletEnabled: true });
        await transport.init();

        sender = await TestUtil.createAccount(transport);
        recipient = await TestUtil.createAccount(transport);
    });

    afterAll(async () => {
        await sender?.close();
        await recipient?.close();
        await recipientSecondDevice?.close();

        await connection.close();
    });

    // eslint-disable-next-line jest/expect-expect -- no assertions are needed because it is sufficient that the onboarding does not throw an error
    test("onboarding does not throw an exception because datawallet modifications are executed in the correct order", async function () {
        const template = await sender!.relationshipTemplates.sendRelationshipTemplate({ content: {}, expiresAt: CoreDate.utc().add({ days: 1 }) });

        // create and decompose a relationship
        await TestUtil.addRelationshipWithExistingTemplate(sender!, recipient!, template);
        await TestUtil.terminateAndDecomposeRelationshipMutually(sender!, recipient!);

        // create a relationship with the same template again
        await TestUtil.addRelationshipWithExistingTemplate(sender!, recipient!, template);

        // onboard a second device for the recipient
        const newDevice = await recipient!.devices.sendDevice({ name: "Test2", isAdmin: true });
        await recipient!.syncDatawallet();
        recipientSecondDevice = await TestUtil.onboardDevice(transport, await recipient!.devices.getSharedSecret(newDevice.id));
    });
});
