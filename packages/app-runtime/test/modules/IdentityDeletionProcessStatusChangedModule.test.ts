import { CoreId } from "@nmshd/core-types";
import { IdentityDeletionProcessStatus } from "@nmshd/runtime";
import { AppRuntime, LocalAccountDeletionDateChangedEvent, LocalAccountDTO, LocalAccountSession } from "../../src";
import { TestUtil } from "../lib";

describe("IdentityDeletionProcessStatusChanged", function () {
    let runtime: AppRuntime;
    let localAccount: LocalAccountDTO;
    let session: LocalAccountSession;

    let runtimeDevice2: AppRuntime | undefined;
    let sessionDevice2: LocalAccountSession | undefined;

    beforeAll(async function () {
        runtime = await TestUtil.createRuntime();
        await runtime.start();

        [localAccount] = await TestUtil.provideAccounts(runtime, 1);
        session = await runtime.selectAccount(localAccount.id);
    });

    afterEach(async () => {
        const activeIdentityDeletionProcess = await session.transportServices.identityDeletionProcesses.getActiveIdentityDeletionProcess();
        if (!activeIdentityDeletionProcess.isSuccess) return;

        if (activeIdentityDeletionProcess.value.status === IdentityDeletionProcessStatus.Approved) {
            const abortResult = await session.transportServices.identityDeletionProcesses.cancelIdentityDeletionProcess();
            if (abortResult.isError) throw abortResult.error;

            if (sessionDevice2 && runtimeDevice2 && sessionDevice2.account.deletionDate) {
                await sessionDevice2.transportServices.account.syncDatawallet();
                await TestUtil.awaitEvent(runtimeDevice2, LocalAccountDeletionDateChangedEvent);
            }
        }
    });

    afterAll(async function () {
        await runtime.stop();
    });

    test("should set the deletionDate of the LocalAccount initiating an IdentityDeletionProcess", async function () {
        expect(session.account.deletionDate).toBeUndefined();

        const initiateDeletionResult = await session.transportServices.identityDeletionProcesses.initiateIdentityDeletionProcess();

        expect(session.account.deletionDate).toBe(initiateDeletionResult.value.gracePeriodEndsAt);

        const account = await runtime.multiAccountController.getAccount(CoreId.from(session.account.id));
        expect(account.deletionDate).toBe(initiateDeletionResult.value.gracePeriodEndsAt);
    });

    test("should unset the deletionDate of the LocalAccount cancelling an IdentityDeletionProcess", async function () {
        await session.transportServices.identityDeletionProcesses.initiateIdentityDeletionProcess();
        expect(session.account.deletionDate).toBeDefined();

        await session.transportServices.identityDeletionProcesses.cancelIdentityDeletionProcess();
        expect(session.account.deletionDate).toBeUndefined();

        const account = await runtime.multiAccountController.getAccount(CoreId.from(session.account.id));
        expect(account.deletionDate).toBeUndefined();
    });

    describe("multi device", function () {
        let runtimeDevice2: AppRuntime;
        let sessionDevice2: LocalAccountSession;

        beforeAll(async function () {
            runtimeDevice2 = await TestUtil.createRuntime();
            await runtimeDevice2.start();

            const createDeviceResult = await session.transportServices.devices.createDevice({ name: "test", isAdmin: true });
            const onboardingInfoResult = await session.transportServices.devices.getDeviceOnboardingInfo({ id: createDeviceResult.value.id, profileName: "Test" });
            const localAccountDevice2 = await runtimeDevice2.accountServices.onboardAccount(onboardingInfoResult.value);
            sessionDevice2 = await runtimeDevice2.selectAccount(localAccountDevice2.id.toString());

            await session.transportServices.account.syncDatawallet();
            await sessionDevice2.transportServices.account.syncDatawallet();
        });

        afterAll(async function () {
            await runtimeDevice2.stop();
        });

        test("should set the deletionDate on the LocalAccount on a second device when an IdentityDeletionProcess is initiated", async function () {
            const initiateDeletionResult = await session.transportServices.identityDeletionProcesses.initiateIdentityDeletionProcess();
            expect(sessionDevice2.account.deletionDate).toBeUndefined();

            await sessionDevice2.transportServices.account.syncDatawallet();
            const event = await TestUtil.awaitEvent(runtimeDevice2, LocalAccountDeletionDateChangedEvent);
            expect(event.data).toBe(initiateDeletionResult.value.gracePeriodEndsAt);

            expect(sessionDevice2.account.deletionDate).toBe(initiateDeletionResult.value.gracePeriodEndsAt);

            const account = await runtimeDevice2.multiAccountController.getAccount(CoreId.from(sessionDevice2.account.id));
            expect(account.deletionDate).toBe(initiateDeletionResult.value.gracePeriodEndsAt);
        });

        test("should unset the deletionDate on the LocalAccount on a second device when an IdentityDeletionProcess is cancelled", async function () {
            await session.transportServices.identityDeletionProcesses.initiateIdentityDeletionProcess();
            await sessionDevice2.transportServices.account.syncDatawallet();
            await TestUtil.awaitEvent(runtimeDevice2, LocalAccountDeletionDateChangedEvent);

            await session.transportServices.identityDeletionProcesses.cancelIdentityDeletionProcess();
            expect(sessionDevice2.account.deletionDate).toBeDefined();

            await sessionDevice2.transportServices.account.syncDatawallet();
            const event = await TestUtil.awaitEvent(runtimeDevice2, LocalAccountDeletionDateChangedEvent);
            expect(event.data).toBeUndefined();

            expect(sessionDevice2.account.deletionDate).toBeUndefined();

            const account = await runtimeDevice2.multiAccountController.getAccount(CoreId.from(sessionDevice2.account.id));
            expect(account.deletionDate).toBeUndefined();
        });
    });
});
