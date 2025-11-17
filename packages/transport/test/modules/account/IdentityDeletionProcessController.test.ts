import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { AccountController, IdentityDeletionProcessStatus, Transport } from "@nmshd/transport";
import { TestUtil } from "../../testHelpers/TestUtil.js";

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
        const activeIdentityDeletionProcess = await account.identityDeletionProcess.getIdentityDeletionProcessByStatus(IdentityDeletionProcessStatus.Active);
        if (!activeIdentityDeletionProcess) {
            return;
        }
        if (activeIdentityDeletionProcess.status === IdentityDeletionProcessStatus.Active) {
            await account.identityDeletionProcess.cancelIdentityDeletionProcess(activeIdentityDeletionProcess.id.toString());
        }
    });

    test("should initiate an IdentityDeletionProcess", async function () {
        const result = await account.identityDeletionProcess.initiateIdentityDeletionProcess();
        expect(result).toBeDefined();
        expect(result.status).toBe(IdentityDeletionProcessStatus.Active);
    });

    test("should get an IdentityDeletionProcess", async function () {
        const identityDeletionProcess = await account.identityDeletionProcess.initiateIdentityDeletionProcess();
        const result = await account.identityDeletionProcess.getIdentityDeletionProcess(identityDeletionProcess.id.toString());
        expect(result).toBeDefined();
        expect(result!.status).toBe(IdentityDeletionProcessStatus.Active);
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
        const result = await account.identityDeletionProcess.getIdentityDeletionProcessByStatus(IdentityDeletionProcessStatus.Active);
        expect(activeIdentityDeletionProcess.toJSON()).toStrictEqual(result!.toJSON());
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
        expect(result[1].status).toBe(IdentityDeletionProcessStatus.Active);
    });
});
