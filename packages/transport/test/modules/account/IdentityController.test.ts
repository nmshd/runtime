import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { AccountController, Transport } from "@nmshd/transport";
import { TestUtil } from "../../testHelpers/TestUtil.js";

describe("IdentityController", function () {
    let connection: IDatabaseConnection;
    let transport: Transport;
    let account1: AccountController;
    let account2: AccountController;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport();

        await transport.init();

        [account1, account2] = await TestUtil.provideAccounts(transport, connection, 2);
        await account1.init();
        await account2.init();
    });

    afterAll(async function () {
        await account1.close();
        await account2.close();
        await connection.close();
    });

    test("should return Identity is not deleted for active Identity", async function () {
        const result = await account1.identity.checkIfIdentityIsDeleted();
        expect(result.value.isDeleted).toBe(false);
        expect(result.value.deletionDate).toBeUndefined();
    });

    test("should return gracePeriodEndsAt for Identity having IdentityDeletionProcess with expired grace period", async function () {
        const identityDeletionProcess = await account1.identityDeletionProcess.initiateIdentityDeletionProcess(0);

        const result = await account1.identity.checkIfIdentityIsDeleted();
        expect(result.value.isDeleted).toBe(true);
        expect(result.value.deletionDate).toBe(identityDeletionProcess.gracePeriodEndsAt!.toString());
    });

    test("should return actual deletionDate for Identity that is deleted", async function () {
        const identityDeletionProcess = await account2.identityDeletionProcess.initiateIdentityDeletionProcess(0);
        await TestUtil.runDeletionJob();

        const result = await account2.identity.checkIfIdentityIsDeleted();
        expect(result.value.isDeleted).toBe(true);
        expect(result.value.deletionDate).toBeDefined();
        expect(result.value.deletionDate).not.toBe(identityDeletionProcess.gracePeriodEndsAt!.toString());
    });
});
