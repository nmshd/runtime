import { IdentityDeletionProcessStatus } from "@nmshd/runtime";
import { AppRuntime, LocalAccountDTO, LocalAccountSession } from "../../src";
import { TestUtil } from "../lib";

describe("MultiAccountController", function () {
    let runtime: AppRuntime;

    let account1: LocalAccountDTO;
    let account2: LocalAccountDTO;
    let account3: LocalAccountDTO;

    let session1: LocalAccountSession;
    let session2: LocalAccountSession;
    let session3: LocalAccountSession;

    beforeAll(async function () {
        runtime = await TestUtil.createRuntime();
        await runtime.start();

        [account1, account2, account3] = await TestUtil.provideAccounts(runtime, 3);

        session1 = await runtime.selectAccount(account1.id);
        session2 = await runtime.selectAccount(account2.id);
        session3 = await runtime.selectAccount(account3.id);
    });

    afterEach(async () => {
        for (const session of [session1, session2, session3]) {
            const activeIdentityDeletionProcess = await session.transportServices.identityDeletionProcesses.getActiveIdentityDeletionProcess();
            if (!activeIdentityDeletionProcess.isSuccess) {
                return;
            }

            let abortResult;
            if (activeIdentityDeletionProcess.value.status === IdentityDeletionProcessStatus.Active) {
                abortResult = await session.transportServices.identityDeletionProcesses.cancelIdentityDeletionProcess();
            }
            if (abortResult?.isError) throw abortResult.error;
        }
    });

    afterAll(async () => await runtime.stop());

    test("should get all accounts", async function () {
        const accounts = await runtime.multiAccountController.getAccounts();
        expect(accounts).toHaveLength(3);

        const addresses = accounts.map((account) => account.address!.toString());
        expect(addresses).toContain(account1.address);
        expect(addresses).toContain(account2.address);
        expect(addresses).toContain(account3.address);
    });

    test("should get all accounts in deletion", async function () {
        await session1.transportServices.identityDeletionProcesses.initiateIdentityDeletionProcess();
        await session2.transportServices.identityDeletionProcesses.initiateIdentityDeletionProcess();

        const accountsInDeletion = await runtime.multiAccountController.getAccountsInDeletion();
        expect(accountsInDeletion).toHaveLength(2);

        const addressesInDeletion = accountsInDeletion.map((account) => account.address!.toString());
        expect(addressesInDeletion).toContain(account1.address);
        expect(addressesInDeletion).toContain(account2.address);
    });

    test("should get all accounts not in deletion", async function () {
        await session1.transportServices.identityDeletionProcesses.initiateIdentityDeletionProcess();
        await session2.transportServices.identityDeletionProcesses.initiateIdentityDeletionProcess();

        const accountsNotInDeletion = await runtime.multiAccountController.getAccountsNotInDeletion();
        expect(accountsNotInDeletion).toHaveLength(1);

        const addressesNotInDeletion = accountsNotInDeletion.map((account) => account.address!.toString());
        expect(addressesNotInDeletion).toContain(account3.address);
    });
});
