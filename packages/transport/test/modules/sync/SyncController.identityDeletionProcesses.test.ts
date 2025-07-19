import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { IdentityDeletionProcessStatus } from "../../../src";
import { AdminApiClient } from "../../testHelpers/AdminApiClient";
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
        expect(result).toStrictEqual(identityDeletionProcess);
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
        expect(result).toStrictEqual(identityDeletionProcess);
    });

    test("initiate IdentityDeletionProcess from Backbone admin API: sync should receive IdentityDeletionProcess on second devices", async function () {
        const { device1: account1, device2: account2 } = await TestUtil.createIdentityWithTwoDevices(connection, {
            datawalletEnabled: true
        });

        const identityDeletionProcess = await AdminApiClient.startIdentityDeletionProcessFromBackboneAdminApi(account1);
        await account1.syncDatawallet();
        await account2.syncDatawallet();

        const result = await account2.identityDeletionProcess.getIdentityDeletionProcessByStatus(IdentityDeletionProcessStatus.WaitingForApproval);
        expect(result).toBeDefined();
        expect(result).toStrictEqualExcluding(identityDeletionProcess, "cachedAt");
    });

    test("reject IdentityDeletionProcess on first device: sync should receive rejected IdentityDeletionProcess on second devices", async function () {
        const { device1: account1, device2: account2 } = await TestUtil.createIdentityWithTwoDevices(connection, {
            datawalletEnabled: true
        });

        let identityDeletionProcess = await AdminApiClient.startIdentityDeletionProcessFromBackboneAdminApi(account1);
        identityDeletionProcess = await account1.identityDeletionProcess.rejectIdentityDeletionProcess(identityDeletionProcess.id.toString());
        await account1.syncDatawallet();
        await account2.syncDatawallet();
        const result = await account2.identityDeletionProcess.getIdentityDeletionProcessByStatus(IdentityDeletionProcessStatus.Rejected);
        expect(result).toBeDefined();
        expect(result).toStrictEqualExcluding(identityDeletionProcess, "cachedAt");
    });

    test("approve IdentityDeletionProcess on first device: sync should receive approved IdentityDeletionProcess on second devices", async function () {
        const { device1: account1, device2: account2 } = await TestUtil.createIdentityWithTwoDevices(connection, {
            datawalletEnabled: true
        });

        let identityDeletionProcess = await AdminApiClient.startIdentityDeletionProcessFromBackboneAdminApi(account1);
        identityDeletionProcess = await account1.identityDeletionProcess.approveIdentityDeletionProcess(identityDeletionProcess.id.toString());
        await account1.syncDatawallet();
        await account2.syncDatawallet();
        const result = await account2.identityDeletionProcess.getIdentityDeletionProcessByStatus(IdentityDeletionProcessStatus.Approved);
        expect(result).toBeDefined();
        expect(result).toStrictEqual(identityDeletionProcess);
    });

    test("cancel IdentityDeletionProcess from Backbone admin API: sync should receive cancelled IdentityDeletionProcess on second devices", async function () {
        const { device1: account1, device2: account2 } = await TestUtil.createIdentityWithTwoDevices(connection, {
            datawalletEnabled: true
        });

        let identityDeletionProcess = await account1.identityDeletionProcess.initiateIdentityDeletionProcess();
        identityDeletionProcess = await AdminApiClient.cancelIdentityDeletionProcessFromBackboneAdminApi(account1, identityDeletionProcess.id);
        await account1.syncDatawallet();
        await account2.syncDatawallet();
        const result = await account2.identityDeletionProcess.getIdentityDeletionProcessByStatus(IdentityDeletionProcessStatus.Cancelled);
        expect(result).toBeDefined();
        expect(result).toStrictEqual(identityDeletionProcess);
    });
});
