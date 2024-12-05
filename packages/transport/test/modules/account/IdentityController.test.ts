import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { sleep } from "@js-soft/ts-utils";
import { AccountController, Transport } from "../../../src";
import { TestUtil } from "../../testHelpers/TestUtil";

describe("IdentityController", function () {
    let connection: IDatabaseConnection;
    let transport: Transport;
    let account: AccountController;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport(connection);

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, 1);
        account = accounts[0];
        await account.init();
    });

    afterAll(async function () {
        await account.close();
        await connection.close();
    });

    test("check deletion of Identity that is not deleted", async function () {
        const result = await account.identity.checkDeletionOfIdentity();
        expect(result.value.isDeleted).toBe(false);
        expect(result.value.deletionDate).toBeUndefined();
    });

    test("check deletion of Identity having IdentityDeletionProcess with expired grace period", async function () {
        const identityDeletionProcess = await account.identityDeletionProcess.initiateIdentityDeletionProcess(0.000001);
        await sleep(1000);

        const result = await account.identity.checkDeletionOfIdentity();
        expect(result.value.isDeleted).toBe(true);
        expect(result.value.deletionDate).toBe(identityDeletionProcess.cache!.gracePeriodEndsAt!.toString());
    });

    test.skip("check deletion of Identity that is deleted", async function () {
        const identityDeletionProcess = await account.identityDeletionProcess.initiateIdentityDeletionProcess(0.000001);
        await sleep(1000);

        await TestUtil.runDeletionJob();

        const result = await account.identity.checkDeletionOfIdentity();
        expect(result.value.isDeleted).toBe(true);
        expect(result.value.deletionDate).toBeDefined();
        expect(result.value.deletionDate).not.toBe(identityDeletionProcess.cache!.gracePeriodEndsAt!.toString());
    });
});
