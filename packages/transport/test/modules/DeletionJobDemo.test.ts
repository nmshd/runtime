import { AccountController } from "../../src";
import { TestUtil } from "../testHelpers/TestUtil";

describe("DeletionJobDemo", function () {
    let account: AccountController;

    beforeAll(async function () {
        const connection = await TestUtil.createDatabaseConnection();
        const transport = TestUtil.createTransport(connection);

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, 1);
        account = accounts[0];
        await account.init();
    });

    // eslint-disable-next-line jest/expect-expect
    test("deletion job demo", async function () {
        await account.identityDeletionProcess.initiateIdentityDeletionProcess();
        await TestUtil.runDeletionJob();
        // TODO: fix "Jest did not exit one second after the test run has completed."
    });
});
