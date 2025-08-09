import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { AccountController, IdentityDeletionProcessStatus, Transport } from "../../../src";
import { AdminApiClient } from "../../testHelpers/AdminApiClient";
import { TestUtil } from "../../testHelpers/TestUtil";

describe("IdentityDeletionProcessController", function () {
    let connection: IDatabaseConnection;
    let transport: Transport;
    let account: AccountController;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport();

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, connection, 1);
        account = accounts[0];
        await account.init();
    });

    afterAll(async function () {
        await account.close();
        await connection.close();
    });

    afterEach(async function () {
        const activeIdentityDeletionProcess = await account.identityDeletionProcess.getIdentityDeletionProcessByStatus(
            IdentityDeletionProcessStatus.Approved,
            IdentityDeletionProcessStatus.WaitingForApproval
        );
        if (!activeIdentityDeletionProcess) {
            return;
        }
        if (activeIdentityDeletionProcess.status === IdentityDeletionProcessStatus.Approved) {
            await account.identityDeletionProcess.cancelIdentityDeletionProcess(activeIdentityDeletionProcess.id.toString());
        } else if (activeIdentityDeletionProcess.status === IdentityDeletionProcessStatus.WaitingForApproval) {
            await account.identityDeletionProcess.rejectIdentityDeletionProcess(activeIdentityDeletionProcess.id.toString());
        }
    });

    test("should initiate an IdentityDeletionProcess", async function () {
        const result = await account.identityDeletionProcess.initiateIdentityDeletionProcess();
        expect(result).toBeDefined();
        expect(result.status).toBe(IdentityDeletionProcessStatus.Approved);
    });

    test("should get an IdentityDeletionProcess", async function () {
        const identityDeletionProcess = await account.identityDeletionProcess.initiateIdentityDeletionProcess();
        const result = await account.identityDeletionProcess.getIdentityDeletionProcess(identityDeletionProcess.id.toString());
        expect(result).toBeDefined();
        expect(result!.status).toBe(IdentityDeletionProcessStatus.Approved);
    });

    test("should cancel an IdentityDeletionProcess", async function () {
        const identityDeletionProcess = await account.identityDeletionProcess.initiateIdentityDeletionProcess();
        const result = await account.identityDeletionProcess.cancelIdentityDeletionProcess(identityDeletionProcess.id.toString());
        expect(result).toBeDefined();
        expect(result.status).toBe(IdentityDeletionProcessStatus.Cancelled);
    });

    test("should get the active IdentityDeletionProcess", async function () {
        const cancelledIdentityDeletionProcess = await account.identityDeletionProcess.initiateIdentityDeletionProcess();
        await account.identityDeletionProcess.cancelIdentityDeletionProcess(cancelledIdentityDeletionProcess.id.toString());
        const activeIdentityDeletionProcess = await account.identityDeletionProcess.initiateIdentityDeletionProcess();
        const result = await account.identityDeletionProcess.getIdentityDeletionProcessByStatus(IdentityDeletionProcessStatus.Approved);
        expect(activeIdentityDeletionProcess.toJSON()).toStrictEqual(result!.toJSON());
    });

    test("should get an IdentityDeletionProcess after it got updated by the Backbone", async function () {
        const identityDeletionProcess = await AdminApiClient.startIdentityDeletionProcessFromBackboneAdminApi(account);
        await account.identityDeletionProcess.approveIdentityDeletionProcess(identityDeletionProcess.id.toString());
        const result = await AdminApiClient.cancelIdentityDeletionProcessFromBackboneAdminApi(account, identityDeletionProcess.id);
        expect(result.status).toBe(IdentityDeletionProcessStatus.Cancelled);
    });

    test("should get all IdentityDeletionProcess", async function () {
        // Initialize a new identity for this test as otherwise it would be depending on the previous tests

        await account.close();
        await connection.close();

        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport();

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, connection, 1);
        account = accounts[0];
        await account.init();

        const cancelledIdentityDeletionProcess = await account.identityDeletionProcess.initiateIdentityDeletionProcess();
        await account.identityDeletionProcess.cancelIdentityDeletionProcess(cancelledIdentityDeletionProcess.id.toString());
        const activeIdentityDeletionProcess = await account.identityDeletionProcess.initiateIdentityDeletionProcess();
        const result = await account.identityDeletionProcess.getIdentityDeletionProcesses();
        expect(result).toBeDefined();
        expect(result).toHaveLength(2);
        expect(result[0].id.toString()).toBe(cancelledIdentityDeletionProcess.id.toString());
        expect(result[0].status).toBe(IdentityDeletionProcessStatus.Cancelled);
        expect(result[1].id.toString()).toBe(activeIdentityDeletionProcess.id.toString());
        expect(result[1].status).toBe(IdentityDeletionProcessStatus.Approved);
    });

    test("should start an IdentityDeletionProcess from the Backbone admin API", async function () {
        const activeIdentityDeletionProcess = await AdminApiClient.startIdentityDeletionProcessFromBackboneAdminApi(account);
        expect(activeIdentityDeletionProcess.status).toBe(IdentityDeletionProcessStatus.WaitingForApproval);
    });

    test("should not start a second IdentityDeletionProcess from the Backbone admin API", async function () {
        await AdminApiClient.startIdentityDeletionProcessFromBackboneAdminApi(account);
        await expect(AdminApiClient.startIdentityDeletionProcessFromBackboneAdminApi(account)).rejects.toThrow("Request failed with status code 400");
    });

    test("should not start an IdentityDeletionProcess from the Backbone admin API if one was already started by the user", async function () {
        await account.identityDeletionProcess.initiateIdentityDeletionProcess();
        await expect(AdminApiClient.startIdentityDeletionProcessFromBackboneAdminApi(account)).rejects.toThrow("Request failed with status code 400");
    });

    test("should get the waiting for approval IdentityDeletionProcess", async function () {
        const cancelledIdentityDeletionProcess = await account.identityDeletionProcess.initiateIdentityDeletionProcess();
        await account.identityDeletionProcess.cancelIdentityDeletionProcess(cancelledIdentityDeletionProcess.id.toString());
        const waitingForApprovalIdentityDeletionProcess = await AdminApiClient.startIdentityDeletionProcessFromBackboneAdminApi(account);
        const result = await account.identityDeletionProcess.getIdentityDeletionProcessByStatus(IdentityDeletionProcessStatus.WaitingForApproval);
        expect(waitingForApprovalIdentityDeletionProcess.toJSON()).toStrictEqual(result!.toJSON());
        expect(waitingForApprovalIdentityDeletionProcess.status).toBe(IdentityDeletionProcessStatus.WaitingForApproval);
    });

    test("should approve an IdentityDeletionProcess that was started from the Backbone admin API", async function () {
        const startedIdentityDeletionProcess = await AdminApiClient.startIdentityDeletionProcessFromBackboneAdminApi(account);

        const result = await account.identityDeletionProcess.approveIdentityDeletionProcess(startedIdentityDeletionProcess.id.toString());
        expect(result).toBeDefined();
        expect(result.id.toString()).toBe(startedIdentityDeletionProcess.id.toString());
        expect(result.status).toBe(IdentityDeletionProcessStatus.Approved);

        const approvedIdentityDeletionProcess = await account.identityDeletionProcess.getIdentityDeletionProcessByStatus(IdentityDeletionProcessStatus.Approved);
        expect(approvedIdentityDeletionProcess).toBeDefined();
        expect(approvedIdentityDeletionProcess!.status).toBe(IdentityDeletionProcessStatus.Approved);
        expect(approvedIdentityDeletionProcess!.id.toString()).toBe(result.id.toString());
    });

    test("should reject an IdentityDeletionProcess that was started from the Backbone admin API", async function () {
        const startedIdentityDeletionProcess = await AdminApiClient.startIdentityDeletionProcessFromBackboneAdminApi(account);

        const result = await account.identityDeletionProcess.rejectIdentityDeletionProcess(startedIdentityDeletionProcess.id.toString());
        expect(result).toBeDefined();
        expect(result.id.toString()).toBe(startedIdentityDeletionProcess.id.toString());
        expect(result.status).toBe(IdentityDeletionProcessStatus.Rejected);

        const rejectedIdentityDeletionProcess = await account.identityDeletionProcess.getIdentityDeletionProcessByStatus(IdentityDeletionProcessStatus.Approved);
        expect(rejectedIdentityDeletionProcess).toBeUndefined();
    });
});
