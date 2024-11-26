import { DatawalletSynchronizedEvent, IdentityDeletionProcessStatus } from "@nmshd/runtime";
import { AppRuntime, LocalAccountDeletionDateChangedEvent, LocalAccountSession } from "../../src";
import { EventListener, TestUtil } from "../lib";

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
        if (!activeIdentityDeletionProcess.isSuccess) {
            return;
        }

        let abortResult;
        if (activeIdentityDeletionProcess.value.status === IdentityDeletionProcessStatus.Approved) {
            abortResult = await sessionDevice1.transportServices.identityDeletionProcesses.cancelIdentityDeletionProcess();
            await sessionDevice2.transportServices.account.syncDatawallet();
            // await TestUtil.awaitEvent(runtimeDevice2, LocalAccountDeletionDateChangedEvent);
        }
        if (abortResult?.isError) throw abortResult.error;
    });

    afterAll(async function () {
        await runtimeDevice1.stop();
        await runtimeDevice2.stop();
    });

    test("should set the deletionDate of the LocalAccount initiate an IdentityDeletionProcess on a second device that is online", async function () {
        const initiateResult = await sessionDevice1.transportServices.identityDeletionProcesses.initiateIdentityDeletionProcess();
        expect(sessionDevice2.account.deletionDate).toBeUndefined();

        await sessionDevice2.transportServices.account.syncDatawallet();
        await TestUtil.awaitEvent(runtimeDevice2, LocalAccountDeletionDateChangedEvent);

        expect(sessionDevice2.account.deletionDate).toBeDefined();
        expect(sessionDevice2.account.deletionDate).toBe(initiateResult.value.gracePeriodEndsAt);
    });

    test("should unset the deletionDate of the LocalAccount cancelling an IdentityDeletionProcess on a second device that is online", async function () {
        await sessionDevice1.transportServices.identityDeletionProcesses.initiateIdentityDeletionProcess();
        await sessionDevice2.transportServices.account.syncDatawallet();
        await TestUtil.awaitEvent(runtimeDevice2, LocalAccountDeletionDateChangedEvent);

        await sessionDevice1.transportServices.identityDeletionProcesses.cancelIdentityDeletionProcess();
        expect(sessionDevice2.account.deletionDate).toBeDefined();

        await sessionDevice2.transportServices.account.syncDatawallet();
        await TestUtil.awaitEvent(runtimeDevice2, LocalAccountDeletionDateChangedEvent);

        expect(sessionDevice2.account.deletionDate).toBeUndefined();
    });

    test("should set the deletionDate of the LocalAccount initiating an IdentityDeletionProcess on a second device that was offline", async function () {
        await runtimeDevice2.stop();

        await sessionDevice1.transportServices.identityDeletionProcesses.initiateIdentityDeletionProcess();
        expect(sessionDevice2.account.deletionDate).toBeUndefined();

        await runtimeDevice2.init(); // TODO: do the modules need to be turned on?
        await runtimeDevice2.start();

        await sessionDevice2.transportServices.account.syncDatawallet();
        // await TestUtil.awaitEvent(runtimeDevice2, LocalAccountDeletionDateChangedEvent);

        expect(sessionDevice2.account.deletionDate).toBeDefined();
    });

    test("should unset the deletionDate of the LocalAccount cancelling an IdentityDeletionProcess on a second device that was offline", async function () {
        await sessionDevice1.transportServices.identityDeletionProcesses.initiateIdentityDeletionProcess();
        await sessionDevice2.transportServices.account.syncDatawallet();
        await TestUtil.awaitEvent(runtimeDevice2, LocalAccountDeletionDateChangedEvent);

        await runtimeDevice2.stop();

        await sessionDevice1.transportServices.identityDeletionProcesses.cancelIdentityDeletionProcess();
        expect(sessionDevice2.account.deletionDate).toBeDefined();

        await runtimeDevice2.init();
        await runtimeDevice2.start();

        await sessionDevice2.transportServices.account.syncDatawallet();
        // await TestUtil.awaitEvent(runtimeDevice2, LocalAccountDeletionDateChangedEvent);

        expect(sessionDevice2.account.deletionDate).toBeDefined();
    });

    test("should publish a LocalAccountDeletionDateChangedEvent if a deletion date is set after a datawallet sync", async function () {
        const initiateDeletionResult = await sessionDevice1.transportServices.identityDeletionProcesses.initiateIdentityDeletionProcess();
        expect(sessionDevice2.account.deletionDate).toBeUndefined();

        const eventListener = new EventListener(runtimeDevice2, [DatawalletSynchronizedEvent, LocalAccountDeletionDateChangedEvent]);
        eventListener.start();

        await sessionDevice2.transportServices.account.syncDatawallet();
        await TestUtil.awaitEvent(runtimeDevice2, LocalAccountDeletionDateChangedEvent);

        eventListener.stop();
        const events = eventListener.getReceivedEvents();
        expect(events).toHaveLength(2);

        const identityDeletionProcessStatusChangedEvent = events[0].instance as DatawalletSynchronizedEvent;
        expect(identityDeletionProcessStatusChangedEvent).toBeInstanceOf(DatawalletSynchronizedEvent);

        const localAccountDeletionDateChangedEvent = events[1].instance as LocalAccountDeletionDateChangedEvent;
        expect(localAccountDeletionDateChangedEvent).toBeInstanceOf(LocalAccountDeletionDateChangedEvent);
        expect(localAccountDeletionDateChangedEvent.data).toBeDefined();
        expect(localAccountDeletionDateChangedEvent.data).toBe(initiateDeletionResult.value.gracePeriodEndsAt);
    });

    test("should publish a LocalAccountDeletionDateChangedEvent if a deletion date is unset after a datawallet sync", async function () {
        await sessionDevice1.transportServices.identityDeletionProcesses.initiateIdentityDeletionProcess();
        await sessionDevice2.transportServices.account.syncDatawallet();
        await TestUtil.awaitEvent(runtimeDevice2, LocalAccountDeletionDateChangedEvent);

        await sessionDevice1.transportServices.identityDeletionProcesses.cancelIdentityDeletionProcess();
        expect(sessionDevice2.account.deletionDate).toBeDefined();

        const eventListener = new EventListener(runtimeDevice2, [DatawalletSynchronizedEvent, LocalAccountDeletionDateChangedEvent]);
        eventListener.start();

        await sessionDevice2.transportServices.account.syncDatawallet();
        await TestUtil.awaitEvent(runtimeDevice2, LocalAccountDeletionDateChangedEvent);

        eventListener.stop();
        const events = eventListener.getReceivedEvents();
        expect(events).toHaveLength(2);

        const identityDeletionProcessStatusChangedEvent = events[0].instance as DatawalletSynchronizedEvent;
        expect(identityDeletionProcessStatusChangedEvent).toBeInstanceOf(DatawalletSynchronizedEvent);

        const localAccountDeletionDateChangedEvent = events[1].instance as LocalAccountDeletionDateChangedEvent;
        expect(localAccountDeletionDateChangedEvent).toBeInstanceOf(LocalAccountDeletionDateChangedEvent);
        expect(localAccountDeletionDateChangedEvent.data).toBeUndefined();
    });
});
