import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { AccountController, IdentityDeletionProcessStatus, Transport } from "../../../src";
import { TestUtil } from "../../testHelpers/TestUtil";

describe("IdentityController", function () {
    let connection: IDatabaseConnection;
    let transport: Transport;
    let account: AccountController;
    let accountUpdateSpy: jest.SpyInstance;

    beforeEach(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport(connection);

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, 1);
        account = accounts[0];
        await account.init();
        accountUpdateSpy = jest.spyOn(account.identity, "update");
    });

    afterEach(async function () {
        await account.close();
        await connection.close();
    });

    test("should initiate an Identity deletion", async function () {
        const result = await account.identity.initiateIdentityDeletion();
        expect(result).toBeDefined();
        expect(result.status).toBe(IdentityDeletionProcessStatus.Approved);
        expect(account.identity.identity.deletionInfo).toBeDefined();
        expect(accountUpdateSpy.mock.calls).toHaveLength(1);
    });

    test("should get all Identity deletions", async function () {
        await account.identity.initiateIdentityDeletion();
        const result = await account.identity.getIdentityDeletionProcesses();
        expect(result).toBeDefined();
        expect(result).toHaveLength(1);
        expect(result[0].status).toBe(IdentityDeletionProcessStatus.Approved);
    });

    test("should get the Identity deletions", async function () {
        const identityDeletionProcess = await account.identity.initiateIdentityDeletion();
        const result = await account.identity.getIdentityDeletionProcess(identityDeletionProcess.id.toString());
        expect(result).toBeDefined();
        expect(result.status).toBe(IdentityDeletionProcessStatus.Approved);
    });

    test("should cancel an Identity deletion", async function () {
        const identityDeletionProcess = await account.identity.initiateIdentityDeletion();
        const result = await account.identity.cancelIdentityDeletion(identityDeletionProcess.id.toString());
        expect(result).toBeDefined();
        expect(result.status).toBe(IdentityDeletionProcessStatus.Cancelled);
        expect(account.identity.identity.deletionInfo).toBeUndefined();
        expect(accountUpdateSpy.mock.calls).toHaveLength(2);
    });
});
