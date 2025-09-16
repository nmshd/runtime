import { CoreId } from "@nmshd/core-types";
import { DeviceMapper, IdentityDeletionProcessStatus } from "@nmshd/runtime";
import { TokenContentDeviceSharedSecret } from "@nmshd/transport";
import { AppRuntime, LocalAccountDeletionDateChangedEvent, LocalAccountDTO, LocalAccountSession } from "../../src";
import { MockEventBus, TestUtil } from "../lib";

describe("IdentityDeletionProcessStatusChanged", function () {
    const eventBusRuntime1 = new MockEventBus();
    let runtime1: AppRuntime;
    let localAccount: LocalAccountDTO;
    let session1: LocalAccountSession;

    const eventBusRuntime2 = new MockEventBus();
    let runtime2: AppRuntime | undefined;
    let session2: LocalAccountSession | undefined;

    beforeAll(async function () {
        runtime1 = await TestUtil.createRuntime(undefined, undefined, eventBusRuntime1);
        await runtime1.start();

        [localAccount] = await TestUtil.provideAccounts(runtime1, 1);
        session1 = await runtime1.selectAccount(localAccount.id);
    });

    afterEach(async () => {
        const activeIdentityDeletionProcess = await session1.transportServices.identityDeletionProcesses.getActiveIdentityDeletionProcess();
        if (!activeIdentityDeletionProcess.isSuccess) return;

        if (activeIdentityDeletionProcess.value.status === IdentityDeletionProcessStatus.Approved) {
            const abortResult = await session1.transportServices.identityDeletionProcesses.cancelIdentityDeletionProcess();
            if (abortResult.isError) throw abortResult.error;

            if (session2 && runtime2 && session2.account.deletionDate) {
                await session2.transportServices.account.syncDatawallet();
                await eventBusRuntime2.waitForRunningEventHandlers();
            }
        }
    });

    afterAll(async function () {
        await runtime1.stop();
        await runtime2?.stop();
        await eventBusRuntime2.close();
    });

    test("should set the deletionDate of the LocalAccount initiating an IdentityDeletionProcess", async function () {
        expect(session1.account.deletionDate).toBeUndefined();

        const initiateDeletionResult = await session1.transportServices.identityDeletionProcesses.initiateIdentityDeletionProcess();
        await eventBusRuntime1.waitForRunningEventHandlers();

        expect(session1.account.deletionDate).toBe(initiateDeletionResult.value.gracePeriodEndsAt);

        const account = await runtime1.multiAccountController.getAccount(CoreId.from(session1.account.id));
        expect(account.deletionDate!.toString()).toBe(initiateDeletionResult.value.gracePeriodEndsAt!.toString());
    });

    test("should unset the deletionDate of the LocalAccount cancelling an IdentityDeletionProcess", async function () {
        await session1.transportServices.identityDeletionProcesses.initiateIdentityDeletionProcess();
        await eventBusRuntime1.waitForRunningEventHandlers();
        expect(session1.account.deletionDate).toBeDefined();

        await session1.transportServices.identityDeletionProcesses.cancelIdentityDeletionProcess();
        await eventBusRuntime1.waitForRunningEventHandlers();
        expect(session1.account.deletionDate).toBeUndefined();

        const account = await runtime1.multiAccountController.getAccount(CoreId.from(session1.account.id));
        expect(account.deletionDate).toBeUndefined();
    });

    describe("multi device", function () {
        beforeAll(async function () {
            runtime2 = await TestUtil.createRuntime(undefined, undefined, eventBusRuntime2);
            await runtime2.start();

            const emptyToken = await runtime2.anonymousServices.tokens.createEmptyToken();
            const fillResult = await session1.transportServices.devices.fillDeviceOnboardingTokenWithNewDevice({ reference: emptyToken.value.reference.truncated });
            const deviceOnboardingDTO = DeviceMapper.toDeviceOnboardingInfoDTO(TokenContentDeviceSharedSecret.from(fillResult.value.content).sharedSecret);
            const localAccountDevice2 = await runtime2.accountServices.onboardAccount(deviceOnboardingDTO);
            session2 = await runtime2.selectAccount(localAccountDevice2.id.toString());

            await session1.transportServices.account.syncDatawallet();
            await session2.transportServices.account.syncDatawallet();
        });

        test("should set the deletionDate of the LocalAccount on a second device when an IdentityDeletionProcess is initiated", async function () {
            const initiateDeletionResult = await session1.transportServices.identityDeletionProcesses.initiateIdentityDeletionProcess();
            expect(session2!.account.deletionDate).toBeUndefined();

            await session2!.transportServices.account.syncDatawallet();

            await expect(eventBusRuntime2).toHavePublished(LocalAccountDeletionDateChangedEvent, (e) => e.data.deletionDate! === initiateDeletionResult.value.gracePeriodEndsAt!);

            expect(session2!.account.deletionDate!.toString()).toStrictEqual(initiateDeletionResult.value.gracePeriodEndsAt);

            const account = await runtime2!.multiAccountController.getAccount(CoreId.from(session2!.account.id));
            expect(account.deletionDate!.toString()).toBe(initiateDeletionResult.value.gracePeriodEndsAt!.toString());
        });

        test("should unset the deletionDate of the LocalAccount on a second device when an IdentityDeletionProcess is cancelled", async function () {
            await session1.transportServices.identityDeletionProcesses.initiateIdentityDeletionProcess();
            await session2!.transportServices.account.syncDatawallet();
            await expect(eventBusRuntime2).toHavePublished(LocalAccountDeletionDateChangedEvent);

            await session1.transportServices.identityDeletionProcesses.cancelIdentityDeletionProcess();
            expect(session2!.account.deletionDate).toBeDefined();

            await session2!.transportServices.account.syncDatawallet();

            await expect(eventBusRuntime2).toHavePublished(LocalAccountDeletionDateChangedEvent, (e) => e.data.deletionDate === undefined);

            expect(session2!.account.deletionDate).toBeUndefined();

            const account = await runtime2!.multiAccountController.getAccount(CoreId.from(session2!.account.id));
            expect(account.deletionDate).toBeUndefined();
        });

        test("should handle multiple synced IdentityDeletionProcesses that happend while not syncing with the last one approved", async function () {
            await session1.transportServices.identityDeletionProcesses.initiateIdentityDeletionProcess();
            await session1.transportServices.identityDeletionProcesses.cancelIdentityDeletionProcess();
            await session1.transportServices.identityDeletionProcesses.initiateIdentityDeletionProcess();
            await session1.transportServices.identityDeletionProcesses.cancelIdentityDeletionProcess();

            const initiateDeletionResult = await session1.transportServices.identityDeletionProcesses.initiateIdentityDeletionProcess();
            expect(session2!.account.deletionDate).toBeUndefined();

            await session2!.transportServices.account.syncDatawallet();

            await expect(eventBusRuntime2).toHavePublished(LocalAccountDeletionDateChangedEvent, (e) => e.data.deletionDate! === initiateDeletionResult.value.gracePeriodEndsAt!);

            expect(session2!.account.deletionDate!.toString()).toStrictEqual(initiateDeletionResult.value.gracePeriodEndsAt);

            const account = await runtime2!.multiAccountController.getAccount(CoreId.from(session2!.account.id));
            expect(account.deletionDate!.toString()).toBe(initiateDeletionResult.value.gracePeriodEndsAt!.toString());
        });

        test("should handle multiple synced IdentityDeletionProcesses that happend while not syncing with the last one cancelled", async function () {
            await session1.transportServices.identityDeletionProcesses.initiateIdentityDeletionProcess();
            await session1.transportServices.identityDeletionProcesses.cancelIdentityDeletionProcess();
            await session1.transportServices.identityDeletionProcesses.initiateIdentityDeletionProcess();
            await session1.transportServices.identityDeletionProcesses.cancelIdentityDeletionProcess();

            await session2!.transportServices.account.syncDatawallet();

            await expect(eventBusRuntime2).toHavePublished(LocalAccountDeletionDateChangedEvent, (e) => e.data.deletionDate === undefined);

            expect(session2!.account.deletionDate).toBeUndefined();

            const account = await runtime2!.multiAccountController.getAccount(CoreId.from(session2!.account.id));
            expect(account.deletionDate).toBeUndefined();
        });
    });
});
