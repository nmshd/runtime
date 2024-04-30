import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { AccountController, IdentityDeletionProcessStatus, Transport } from "../../../src";
import { TestUtil } from "../../testHelpers/TestUtil";

describe("IdentityDeletionProcessController", function () {
    let connection: IDatabaseConnection;
    let transport: Transport;
    let account: AccountController;

    beforeEach(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport(connection);

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, 1);
        account = accounts[0];
        await account.init();
    });

    afterEach(async function () {
        await account.close();
        await connection.close();
    });

    test("should initiate an Identity deletion process", async function () {
        const result = await account.identityDeletionProcess.initiateIdentityDeletionProcess();
        expect(result).toBeDefined();
        expect(result.status).toBe(IdentityDeletionProcessStatus.Approved);
    });

    test("should get an Identity deletion process", async function () {
        const identityDeletionProcess = await account.identityDeletionProcess.initiateIdentityDeletionProcess();
        const result = await account.identityDeletionProcess.getIdentityDeletionProcess(identityDeletionProcess.id.toString());
        expect(result).toBeDefined();
        expect(result!.status).toBe(IdentityDeletionProcessStatus.Approved);
    });

    test("should cancel an Identity deletion process", async function () {
        const identityDeletionProcess = await account.identityDeletionProcess.initiateIdentityDeletionProcess();
        const result = await account.identityDeletionProcess.cancelIdentityDeletionProcess(identityDeletionProcess.id.toString());
        expect(result).toBeDefined();
        expect(result.status).toBe(IdentityDeletionProcessStatus.Cancelled);
    });

    test("should get the active Identity deletion process", async function () {
        const cancelledIdentityDeletionProcess = await account.identityDeletionProcess.initiateIdentityDeletionProcess();
        await account.identityDeletionProcess.cancelIdentityDeletionProcess(cancelledIdentityDeletionProcess.id.toString());
        const activeIdentityDeletionProcess = await account.identityDeletionProcess.initiateIdentityDeletionProcess();
        const result = await account.identityDeletionProcess.getActiveIdentityDeletionProcess();
        expect(activeIdentityDeletionProcess.toBase64()).toBe(result!.toBase64());
    });

    test("should get all Identity deletion processes", async function () {
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

    test("should start an Identity deletion process from the Backbone admin API", async function () {
        const activeIdentityDeletionProcess = await TestUtil.startIdentityDeletionProcessFromBackboneAdminApi(account);
        expect(activeIdentityDeletionProcess.status).toBe(IdentityDeletionProcessStatus.WaitingForApproval);
    });

    test("should not start a second Identity deletion process from the Backbone admin API", async function () {
        await TestUtil.startIdentityDeletionProcessFromBackboneAdminApi(account);
        await expect(TestUtil.startIdentityDeletionProcessFromBackboneAdminApi(account)).rejects.toThrow("Request failed with status code 400");
    });

    test("should not start an Identity deletion process from the Backbone admin API if one was already started by the user", async function () {
        await account.identityDeletionProcess.initiateIdentityDeletionProcess();
        await expect(TestUtil.startIdentityDeletionProcessFromBackboneAdminApi(account)).rejects.toThrow("Request failed with status code 400");
    });

    test("should approve an Identity deletion process", async function () {
        const startedIdentityDeletionProcess = await TestUtil.startIdentityDeletionProcessFromBackboneAdminApi(account);

        const result = await account.identityDeletionProcess.approveIdentityDeletionProcess(startedIdentityDeletionProcess.id.toString());
        expect(result).toBeDefined();
        expect(result.id.toString()).toBe(startedIdentityDeletionProcess.id.toString());
        expect(result.status).toBe(IdentityDeletionProcessStatus.Approved);

        const approvedIdentityDeletionProcess = await account.identityDeletionProcess.getActiveIdentityDeletionProcess();
        expect(approvedIdentityDeletionProcess).toBeDefined();
        expect(approvedIdentityDeletionProcess!.status).toBe(IdentityDeletionProcessStatus.Approved);
        expect(approvedIdentityDeletionProcess!.id.toString()).toBe(result.id.toString());
    });

    test("should reject an Identity deletion process", async function () {
        const startedIdentityDeletionProcess = await TestUtil.startIdentityDeletionProcessFromBackboneAdminApi(account);

        const result = await account.identityDeletionProcess.rejectIdentityDeletionProcess(startedIdentityDeletionProcess.id.toString());
        expect(result).toBeDefined();
        expect(result.id.toString()).toBe(startedIdentityDeletionProcess.id.toString());
        expect(result.status).toBe(IdentityDeletionProcessStatus.Rejected);

        const rejectedIdentityDeletionProcess = await account.identityDeletionProcess.getActiveIdentityDeletionProcess();
        expect(rejectedIdentityDeletionProcess).toBeUndefined();
    });
});
