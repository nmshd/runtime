import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { CoreDate } from "@nmshd/core-types";
import { TestUtil } from "../../testHelpers/TestUtil";

describe("SyncController.error", function () {
    let connection: IDatabaseConnection;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
    });

    afterAll(async () => {
        await connection.close();
    });

    test("applying external events on templatorDevice2 should fail when templatorDevice1 has not synced its datawallet", async function () {
        const requestorDevice = await TestUtil.createIdentityWithOneDevice(connection, { datawalletEnabled: true });

        const { device1: templatorDevice1, device2: templatorDevice2 } = await TestUtil.createIdentityWithTwoDevices(connection, { datawalletEnabled: true });

        const templateOnTemplatorDevice = await templatorDevice1.relationshipTemplates.sendRelationshipTemplate({
            content: { someTemplateContent: "someTemplateContent" },
            expiresAt: CoreDate.utc().add({ minutes: 5 }),
            maxNumberOfAllocations: 1
        });
        // The templatorDevice1 doesn't sync the datawallet after creating the template.
        // The external event triggered by creating a relationship will throw an error
        // in the ExternalEventsProcessor of templatorDevice2, because the template
        // doesn't exist on templatorDevice2

        const templateOnRequestorDevice = await requestorDevice.relationshipTemplates.loadPeerRelationshipTemplate(
            templateOnTemplatorDevice.id,
            templateOnTemplatorDevice.secretKey
        );

        await requestorDevice.relationships.sendRelationship({
            template: templateOnRequestorDevice,
            creationContent: { someMessageContent: "someMessageContent" }
        });

        const error = await TestUtil.syncUntilHasError(templatorDevice2);
        expect(error.code).toBe("error.transport.errorWhileApplyingExternalEvents");
        expect(error.message).toMatch(/error.transport.errorWhileApplyingExternalEvents: 'error.transport.recordNotFound'/);
    });
});
