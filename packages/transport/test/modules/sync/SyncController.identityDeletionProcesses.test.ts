import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { IdentityDeletionProcessStatus } from "../../../src";
import { TestUtil } from "../../testHelpers/TestUtil";

describe("IdentityDeletionProcessSync", function () {
    let connection: IDatabaseConnection;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
    });

    afterAll(async () => {
        await connection.close();
    });

    test("initiate IdentityDeletionProcess on first device: sync should receive IdentityDeletionProcess on a second device", async function () {
        const { device1: account1, device2: account2 } = await TestUtil.createIdentityWithTwoDevices(connection, {
            datawalletEnabled: true
        });

        const identityDeletionProcess = await account1.identityDeletionProcess.initiateIdentityDeletionProcess();
        await account1.syncDatawallet();
        await account2.syncDatawallet();
        const result = await account2.identityDeletionProcess.getIdentityDeletionProcessByStatus(IdentityDeletionProcessStatus.Approved);
        expect(result).toBeDefined();
        expect(result).toStrictEqualExcluding(identityDeletionProcess, "cachedAt");
    });

    test("cancel IdentityDeletionProcess on first device: sync should receive cancelled IdentityDeletionProcess on second device", async function () {
        const { device1: account1, device2: account2 } = await TestUtil.createIdentityWithTwoDevices(connection, {
            datawalletEnabled: true
        });

        let identityDeletionProcess = await account1.identityDeletionProcess.initiateIdentityDeletionProcess();
        identityDeletionProcess = await account1.identityDeletionProcess.cancelIdentityDeletionProcess(identityDeletionProcess.id.toString());
        await account1.syncDatawallet();
        await account2.syncDatawallet();
        const result = await account2.identityDeletionProcess.getIdentityDeletionProcessByStatus(IdentityDeletionProcessStatus.Cancelled);
        expect(result).toBeDefined();
        expect(result).toStrictEqualExcluding(identityDeletionProcess, "cachedAt");
    });
});
