import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { AccountController, CoreId, IdentityDeletionProcessStatus, Transport } from "../../../src";
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

    test("should approve an Identity deletion process", async function () {
        const adminApiClient = await TestUtil.getBackboneAdminApiClient();
        const deletionProcess = await adminApiClient.post<{ result: { id: string } }>(
            `http://localhost:8091/api/v1/Identities/${account.identity.address.toString()}/DeletionProcesses`
        );
        await TestUtil.syncUntilHasIdentityDeletionProcess(account, CoreId.from(deletionProcess.data.result.id));

        let activeIdentityDeletionProcess = await account.identityDeletionProcess.getActiveIdentityDeletionProcess();
        expect(activeIdentityDeletionProcess).toBeDefined();
        expect(activeIdentityDeletionProcess!.status).toBe(IdentityDeletionProcessStatus.WaitingForApproval);
        expect(activeIdentityDeletionProcess!.id.toString()).toBe(deletionProcess.data.result.id);

        const result = await account.identityDeletionProcess.approveIdentityDeletionProcess(activeIdentityDeletionProcess!.id.toString());
        expect(result).toBeDefined();
        expect(result.id.toString()).toBe(deletionProcess.data.result.id);
        expect(result.status).toBe(IdentityDeletionProcessStatus.Approved);

        activeIdentityDeletionProcess = await account.identityDeletionProcess.getActiveIdentityDeletionProcess();
        expect(activeIdentityDeletionProcess).toBeDefined();
        expect(activeIdentityDeletionProcess!.status).toBe(IdentityDeletionProcessStatus.Approved);
        expect(activeIdentityDeletionProcess!.id.toString()).toBe(result.id.toString());
    });

    test("should reject an Identity deletion process", async function () {
        const adminApiClient = await TestUtil.getBackboneAdminApiClient();
        const deletionProcess = await adminApiClient.post<{ result: { id: string } }>(
            `http://localhost:8091/api/v1/Identities/${account.identity.address.toString()}/DeletionProcesses`
        );
        await TestUtil.syncUntilHasIdentityDeletionProcess(account, CoreId.from(deletionProcess.data.result.id));

        let activeIdentityDeletionProcess = await account.identityDeletionProcess.getActiveIdentityDeletionProcess();
        expect(activeIdentityDeletionProcess).toBeDefined();
        expect(activeIdentityDeletionProcess!.status).toBe(IdentityDeletionProcessStatus.WaitingForApproval);
        expect(activeIdentityDeletionProcess!.id.toString()).toBe(deletionProcess.data.result.id);

        const result = await account.identityDeletionProcess.rejectIdentityDeletionProcess(activeIdentityDeletionProcess!.id.toString());
        expect(result).toBeDefined();
        expect(result.id.toString()).toBe(deletionProcess.data.result.id);
        expect(result.status).toBe(IdentityDeletionProcessStatus.Rejected);

        activeIdentityDeletionProcess = await account.identityDeletionProcess.getActiveIdentityDeletionProcess();
        expect(activeIdentityDeletionProcess).toBeUndefined();
    });
});
