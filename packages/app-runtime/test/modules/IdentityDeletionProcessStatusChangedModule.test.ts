import { IdentityDeletionProcessStatus, IdentityDeletionProcessStatusChangedEvent } from "@nmshd/runtime";
import { AppRuntime, LocalAccountDeletionDateChangedEvent, LocalAccountSession } from "../../src";
import { EventListener, TestUtil } from "../lib";

describe("IdentityDeletionProcessStatusChanged", function () {
    let runtimeDevice1: AppRuntime;
    let sessionDevice1: LocalAccountSession;

    beforeAll(async function () {
        runtimeDevice1 = await TestUtil.createRuntime();
        await runtimeDevice1.start();

        const [localAccountDevice1] = await TestUtil.provideAccounts(runtimeDevice1, 1);
        sessionDevice1 = await runtimeDevice1.selectAccount(localAccountDevice1.id);
    });

    afterEach(async () => {
        const activeIdentityDeletionProcess = await sessionDevice1.transportServices.identityDeletionProcesses.getActiveIdentityDeletionProcess();
        if (!activeIdentityDeletionProcess.isSuccess) {
            return;
        }

        let abortResult;
        if (activeIdentityDeletionProcess.value.status === IdentityDeletionProcessStatus.Approved) {
            abortResult = await sessionDevice1.transportServices.identityDeletionProcesses.cancelIdentityDeletionProcess();
        }
        if (abortResult?.isError) throw abortResult.error;
    });

    afterAll(async function () {
        await runtimeDevice1.stop();
    });

    test("should fire an event and set the deletionDate of the LocalAccount initiating an IdentityDeletionProcess", async function () {
        expect(sessionDevice1.account.deletionDate).toBeUndefined();

        const eventListener = new EventListener(runtimeDevice1, [LocalAccountDeletionDateChangedEvent, IdentityDeletionProcessStatusChangedEvent]);
        eventListener.start();

        const initiateDeletionResult = await sessionDevice1.transportServices.identityDeletionProcesses.initiateIdentityDeletionProcess();

        eventListener.stop();
        const events = eventListener.getReceivedEvents();
        expect(events).toHaveLength(2);

        const identityDeletionProcessStatusChangedEvent = events[0].instance as IdentityDeletionProcessStatusChangedEvent;
        expect(identityDeletionProcessStatusChangedEvent).toBeInstanceOf(IdentityDeletionProcessStatusChangedEvent);
        expect(identityDeletionProcessStatusChangedEvent.data).toBeDefined();
        expect(identityDeletionProcessStatusChangedEvent.data.id).toBe(initiateDeletionResult.value.id);

        const localAccountDeletionDateChangedEvent = events[1].instance as LocalAccountDeletionDateChangedEvent;
        expect(localAccountDeletionDateChangedEvent).toBeInstanceOf(LocalAccountDeletionDateChangedEvent);
        expect(localAccountDeletionDateChangedEvent.data).toBeDefined();
        expect(localAccountDeletionDateChangedEvent.data).toBe(initiateDeletionResult.value.gracePeriodEndsAt);

        expect(sessionDevice1.account.deletionDate).toBeDefined();
        expect(sessionDevice1.account.deletionDate).toBe(initiateDeletionResult.value.gracePeriodEndsAt);
    });

    test("should fire an event and set the deletionDate of the LocalAccount cancelling an IdentityDeletionProcess", async function () {
        await sessionDevice1.transportServices.identityDeletionProcesses.initiateIdentityDeletionProcess();

        const eventListener = new EventListener(runtimeDevice1, [LocalAccountDeletionDateChangedEvent, IdentityDeletionProcessStatusChangedEvent]);
        eventListener.start();

        const cancelDeletionResult = await sessionDevice1.transportServices.identityDeletionProcesses.cancelIdentityDeletionProcess();

        eventListener.stop();
        const events = eventListener.getReceivedEvents();
        expect(events).toHaveLength(2);

        const identityDeletionProcessStatusChangedEvent = events[0].instance as IdentityDeletionProcessStatusChangedEvent;
        expect(identityDeletionProcessStatusChangedEvent).toBeInstanceOf(IdentityDeletionProcessStatusChangedEvent);
        expect(identityDeletionProcessStatusChangedEvent.data).toBeDefined();
        expect(identityDeletionProcessStatusChangedEvent.data.id).toBe(cancelDeletionResult.value.id);

        const localAccountDeletionDateChangedEvent = events[1].instance as LocalAccountDeletionDateChangedEvent;
        expect(localAccountDeletionDateChangedEvent).toBeInstanceOf(LocalAccountDeletionDateChangedEvent);
        expect(localAccountDeletionDateChangedEvent.data).toBeUndefined();

        expect(sessionDevice1.account.deletionDate).toBeUndefined();
    });

    describe("multiple devices", function () {
        let runtimeDevice2: AppRuntime;
        let sessionDevice2: LocalAccountSession;

        beforeAll(async function () {
            runtimeDevice2 = await TestUtil.createRuntime();
            await runtimeDevice2.start();

            const createDeviceResult = await sessionDevice1.transportServices.devices.createDevice({ name: "test", isAdmin: true });
            const onboardingInfoResult = await sessionDevice1.transportServices.devices.getDeviceOnboardingInfo({ id: createDeviceResult.value.id, profileName: "Test" });

            const localAccountDevice2 = await runtimeDevice2.accountServices.onboardAccount(onboardingInfoResult.value);
            sessionDevice2 = await runtimeDevice2.selectAccount(localAccountDevice2.id.toString());

            await sessionDevice1.transportServices.account.syncDatawallet();
            await sessionDevice2.transportServices.account.syncDatawallet();
        });

        afterAll(async function () {
            await runtimeDevice2.stop();
        });

        test("should set the deletionDate of the LocalAccount on a second device that is online", async function () {
            await sessionDevice1.transportServices.identityDeletionProcesses.initiateIdentityDeletionProcess();
            expect(sessionDevice2.account.deletionDate).toBeUndefined();

            await sessionDevice2.transportServices.account.syncDatawallet();
            expect(sessionDevice2.account.deletionDate).toBeDefined();
        });

        test("should set the deletionDate of the LocalAccount on a second device that was offline", async function () {
            await runtimeDevice2.stop();
            await sessionDevice1.transportServices.identityDeletionProcesses.initiateIdentityDeletionProcess();
            expect(sessionDevice2.account.deletionDate).toBeUndefined();

            await runtimeDevice2.start();
            await sessionDevice2.transportServices.account.syncDatawallet();
            expect(sessionDevice2.account.deletionDate).toBeDefined();
        });
    });
});
