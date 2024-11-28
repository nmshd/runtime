import { CoreId } from "@nmshd/core-types";
import { IdentityDeletionProcessStatus } from "@nmshd/runtime";
import { AppRuntime, LocalAccountDeletionDateChangedEvent, LocalAccountSession } from "../../src";
import { TestUtil } from "../lib";

describe("DatawalletSynchronized", function () {
    let runtimeDevice1: AppRuntime;
    let sessionDevice1: LocalAccountSession;

    let runtimeDevice2: AppRuntime;
    let sessionDevice2: LocalAccountSession;

    beforeAll(async function () {
        runtimeDevice1 = await TestUtil.createRuntime();
        await runtimeDevice1.start();

        const [localAccountDevice1] = await TestUtil.provideAccounts(runtimeDevice1, 1);
        sessionDevice1 = await runtimeDevice1.selectAccount(localAccountDevice1.id);

        runtimeDevice2 = await TestUtil.createRuntime();
        await runtimeDevice2.start();

        const createDeviceResult = await sessionDevice1.transportServices.devices.createDevice({ name: "test", isAdmin: true });
        const onboardingInfoResult = await sessionDevice1.transportServices.devices.getDeviceOnboardingInfo({ id: createDeviceResult.value.id, profileName: "Test" });
        const localAccountDevice2 = await runtimeDevice2.accountServices.onboardAccount(onboardingInfoResult.value);
        sessionDevice2 = await runtimeDevice2.selectAccount(localAccountDevice2.id.toString());

        await sessionDevice1.transportServices.account.syncDatawallet();
        await sessionDevice2.transportServices.account.syncDatawallet();
    });

    afterEach(async () => {
        const activeIdentityDeletionProcess = await sessionDevice1.transportServices.identityDeletionProcesses.getActiveIdentityDeletionProcess();
        if (!activeIdentityDeletionProcess.isSuccess) return;

        if (activeIdentityDeletionProcess.value.status === IdentityDeletionProcessStatus.Approved) {
            const abortResult = await sessionDevice1.transportServices.identityDeletionProcesses.cancelIdentityDeletionProcess();
            if (abortResult.isError) throw abortResult.error;

            await sessionDevice2.transportServices.account.syncDatawallet();
            await TestUtil.awaitEvent(runtimeDevice2, LocalAccountDeletionDateChangedEvent);
        }
    });

    afterAll(async function () {
        await runtimeDevice1.stop();
        await runtimeDevice2.stop();
    });

    test("should set the deletionDate on the LocalAccount on a second device when an IdentityDeletionProcess is initiated", async function () {
        const initiateDeletionResult = await sessionDevice1.transportServices.identityDeletionProcesses.initiateIdentityDeletionProcess();
        expect(sessionDevice2.account.deletionDate).toBeUndefined();

        await sessionDevice2.transportServices.account.syncDatawallet();
        const event = await TestUtil.awaitEvent(runtimeDevice2, LocalAccountDeletionDateChangedEvent);
        expect(event.data).toBe(initiateDeletionResult.value.gracePeriodEndsAt);

        expect(sessionDevice2.account.deletionDate).toBe(initiateDeletionResult.value.gracePeriodEndsAt);

        const account = await runtimeDevice2.multiAccountController.getAccount(CoreId.from(sessionDevice2.account.id));
        expect(account.deletionDate!.toString()).toBe(initiateDeletionResult.value.gracePeriodEndsAt);
    });

    test("should unset the deletionDate on the LocalAccount on a second device when an IdentityDeletionProcess is cancelled", async function () {
        await sessionDevice1.transportServices.identityDeletionProcesses.initiateIdentityDeletionProcess();
        await sessionDevice2.transportServices.account.syncDatawallet();
        await TestUtil.awaitEvent(runtimeDevice2, LocalAccountDeletionDateChangedEvent);

        await sessionDevice1.transportServices.identityDeletionProcesses.cancelIdentityDeletionProcess();
        expect(sessionDevice2.account.deletionDate).toBeDefined();

        await sessionDevice2.transportServices.account.syncDatawallet();
        const event = await TestUtil.awaitEvent(runtimeDevice2, LocalAccountDeletionDateChangedEvent);
        expect(event.data).toBeUndefined();

        expect(sessionDevice2.account.deletionDate).toBeUndefined();

        const account = await runtimeDevice2.multiAccountController.getAccount(CoreId.from(sessionDevice2.account.id));
        expect(account.deletionDate).toBeUndefined();
    });
});
