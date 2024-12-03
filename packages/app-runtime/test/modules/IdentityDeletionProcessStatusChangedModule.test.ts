import { CoreId } from "@nmshd/core-types";
import { IdentityDeletionProcessStatus } from "@nmshd/runtime";
import { AppRuntime, LocalAccountDeletionDateChangedEvent, LocalAccountDTO, LocalAccountSession } from "../../src";
import { MockEventBus, TestUtil } from "../lib";

describe("IdentityDeletionProcessStatusChanged", function () {
    let runtime: AppRuntime;
    let localAccount: LocalAccountDTO;
    let session: LocalAccountSession;

    const eventBus = new MockEventBus();
    let runtime2: AppRuntime | undefined;
    let session2: LocalAccountSession | undefined;

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

            if (session2 && runtime2 && session2.account.deletionDate) {
                await session2.transportServices.account.syncDatawallet();
                await eventBus.waitForRunningEventHandlers();
            }
        }
    });

    afterAll(async function () {
        await runtime.stop();
        await runtime2?.stop();
        await eventBus.close();
    });

    test("should set the deletionDate of the LocalAccount initiating an IdentityDeletionProcess", async function () {
        expect(session.account.deletionDate).toBeUndefined();

        const initiateDeletionResult = await session.transportServices.identityDeletionProcesses.initiateIdentityDeletionProcess();

        expect(session.account.deletionDate).toBe(initiateDeletionResult.value.gracePeriodEndsAt);

        const account = await runtime.multiAccountController.getAccount(CoreId.from(session.account.id));
        expect(account.deletionDate!.toString()).toBe(initiateDeletionResult.value.gracePeriodEndsAt!.toString());
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
        beforeAll(async function () {
            runtime2 = await TestUtil.createRuntime(undefined, undefined, eventBus);
            await runtime2.start();

            const createDeviceResult = await session.transportServices.devices.createDevice({ name: "aName", isAdmin: true });
            const onboardingInfoResult = await session.transportServices.devices.getDeviceOnboardingInfo({ id: createDeviceResult.value.id, profileName: "aProfileName" });
            const localAccountDevice2 = await runtime2.accountServices.onboardAccount(onboardingInfoResult.value);
            session2 = await runtime2.selectAccount(localAccountDevice2.id.toString());

            await session.transportServices.account.syncDatawallet();
            await session2.transportServices.account.syncDatawallet();
        });

        test("should set the deletionDate of the LocalAccount on a second device when an IdentityDeletionProcess is initiated", async function () {
            const initiateDeletionResult = await session.transportServices.identityDeletionProcesses.initiateIdentityDeletionProcess();
            expect(session2!.account.deletionDate).toBeUndefined();

            await session2!.transportServices.account.syncDatawallet();

            await expect(eventBus).toHavePublished(LocalAccountDeletionDateChangedEvent, (e) => e.data.deletionDate! === initiateDeletionResult.value.gracePeriodEndsAt!);

            expect(session2!.account.deletionDate!.toString()).toStrictEqual(initiateDeletionResult.value.gracePeriodEndsAt);

            const account = await runtime2!.multiAccountController.getAccount(CoreId.from(session2!.account.id));
            expect(account.deletionDate!.toString()).toBe(initiateDeletionResult.value.gracePeriodEndsAt!.toString());
        });

        test("should unset the deletionDate of the LocalAccount on a second device when an IdentityDeletionProcess is cancelled", async function () {
            await session.transportServices.identityDeletionProcesses.initiateIdentityDeletionProcess();
            await session2!.transportServices.account.syncDatawallet();
            await expect(eventBus).toHavePublished(LocalAccountDeletionDateChangedEvent);

            await session.transportServices.identityDeletionProcesses.cancelIdentityDeletionProcess();
            expect(session2!.account.deletionDate).toBeDefined();

            await session2!.transportServices.account.syncDatawallet();

            await expect(eventBus).toHavePublished(LocalAccountDeletionDateChangedEvent, (e) => e.data.deletionDate === undefined);

            expect(session2!.account.deletionDate).toBeUndefined();

            const account = await runtime2!.multiAccountController.getAccount(CoreId.from(session2!.account.id));
            expect(account.deletionDate).toBeUndefined();
        });
    });
});
