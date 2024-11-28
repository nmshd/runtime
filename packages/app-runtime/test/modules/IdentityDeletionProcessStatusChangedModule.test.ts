import { CoreId } from "@nmshd/core-types";
import { IdentityDeletionProcessStatus } from "@nmshd/runtime";
import { AppRuntime, LocalAccountSession } from "../../src";
import { TestUtil } from "../lib";

describe("IdentityDeletionProcessStatusChanged", function () {
    let runtime: AppRuntime;
    let session: LocalAccountSession;

    beforeAll(async function () {
        runtime = await TestUtil.createRuntime();
        await runtime.start();

        const [localAccount] = await TestUtil.provideAccounts(runtime, 1);
        session = await runtime.selectAccount(localAccount.id);
    });

    afterEach(async () => {
        const activeIdentityDeletionProcess = await session.transportServices.identityDeletionProcesses.getActiveIdentityDeletionProcess();
        if (!activeIdentityDeletionProcess.isSuccess) return;

        if (activeIdentityDeletionProcess.value.status === IdentityDeletionProcessStatus.Approved) {
            const abortResult = await session.transportServices.identityDeletionProcesses.cancelIdentityDeletionProcess();
            if (abortResult.isError) throw abortResult.error;
        }
    });

    afterAll(async () => await runtime.stop());

    test("should set the deletionDate on the LocalAccount initiating an IdentityDeletionProcess", async function () {
        expect(session.account.deletionDate).toBeUndefined();

        const initiateDeletionResult = await session.transportServices.identityDeletionProcesses.initiateIdentityDeletionProcess();

        expect(session.account.deletionDate).toBe(initiateDeletionResult.value.gracePeriodEndsAt);

        const account = await runtime.multiAccountController.getAccount(CoreId.from(session.account.id));
        expect(account.deletionDate!.toString()).toBe(initiateDeletionResult.value.gracePeriodEndsAt);
    });

    test("should unset the deletionDate on the LocalAccount cancelling an IdentityDeletionProcess", async function () {
        await session.transportServices.identityDeletionProcesses.initiateIdentityDeletionProcess();
        expect(session.account.deletionDate).toBeDefined();

        await session.transportServices.identityDeletionProcesses.cancelIdentityDeletionProcess();
        expect(session.account.deletionDate).toBeUndefined();

        const account = await runtime.multiAccountController.getAccount(CoreId.from(session.account.id));
        expect(account.deletionDate).toBeUndefined();
    });
});
