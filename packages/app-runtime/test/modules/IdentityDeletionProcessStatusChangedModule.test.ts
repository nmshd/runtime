import { Serializable } from "@js-soft/ts-serval";
import { IdentityDeletionProcessStatus, IdentityDeletionProcessStatusChangedEvent } from "@nmshd/runtime";
import { AppRuntime, LocalAccountDeletionDateChangedEvent, LocalAccountSession } from "../../src";
import { EventListener, TestUtil } from "../lib";

describe("IdentityDeletionProcessStatusChanged", function () {
    let runtime: AppRuntime;
    let session: LocalAccountSession;

    beforeAll(async function () {
        runtime = await TestUtil.createRuntime();
        await runtime.start();

        const accounts = await TestUtil.provideAccounts(runtime, 1);

        session = await runtime.selectAccount(accounts[0].id);
    });

    afterEach(async () => {
        const activeIdentityDeletionProcess = await session.transportServices.identityDeletionProcesses.getActiveIdentityDeletionProcess();
        if (!activeIdentityDeletionProcess.isSuccess) {
            return;
        }

        let abortResult;
        if (activeIdentityDeletionProcess.value.status === IdentityDeletionProcessStatus.Approved) {
            abortResult = await session.transportServices.identityDeletionProcesses.cancelIdentityDeletionProcess();
        }
        if (abortResult?.isError) throw abortResult.error;
    });

    afterAll(async function () {
        await runtime.stop();
    });

    test("should fire an event and set the deletionDate of the LocalAccount initiating an IdentityDeletionProcess", async function () {
        expect(session.account.deletionDate).toBeUndefined();

        const eventListener = new EventListener(runtime, [LocalAccountDeletionDateChangedEvent, IdentityDeletionProcessStatusChangedEvent]);
        eventListener.start();

        const initiateDeletionResult = await session.transportServices.identityDeletionProcesses.initiateIdentityDeletionProcess();

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

        expect(session.account.deletionDate).toBeDefined();
        expect(session.account.deletionDate).toBe(initiateDeletionResult.value.gracePeriodEndsAt);
    });

    test("should fire an event and set the deletionDate of the LocalAccount cancelling an IdentityDeletionProcess", async function () {
        await session.transportServices.identityDeletionProcesses.initiateIdentityDeletionProcess();

        const eventListener = new EventListener(runtime, [LocalAccountDeletionDateChangedEvent, IdentityDeletionProcessStatusChangedEvent]);
        eventListener.start();

        const cancelDeletionResult = await session.transportServices.identityDeletionProcesses.cancelIdentityDeletionProcess();

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

        expect(session.account.deletionDate).toBeUndefined();
    });

    describe("multiple devices", function () {
        let runtimeDevice2: AppRuntime;
        let sessionDevice2: LocalAccountSession;

        beforeAll(async function () {
            runtimeDevice2 = await TestUtil.createRuntime();
            await runtimeDevice2.start();

            const newDevice = await session.transportServices.devices.createDevice({ name: "test", isAdmin: true });
            const token = await session.transportServices.devices.getDeviceOnboardingToken({ id: newDevice.value.id, profileName: "Test" });
            const content: any = Serializable.fromUnknown(token.value.content);

            const [accountDevice2] = await runtimeDevice2.multiAccountController.onboardDevice(content.sharedSecret, "test");
            sessionDevice2 = await runtimeDevice2.selectAccount(accountDevice2.id.toString());
        });

        afterAll(async function () {
            await runtimeDevice2.stop();
        });

        test("should set the deletionDate of the LocalAccount on a second device that is online", async function () {
            await session.transportServices.identityDeletionProcesses.initiateIdentityDeletionProcess();
            expect(sessionDevice2.account.deletionDate).toBeUndefined();

            await sessionDevice2.transportServices.account.syncDatawallet();
            expect(sessionDevice2.account.deletionDate).toBeDefined();
        });

        test("should set the deletionDate of the LocalAccount on a second device that was offline", async function () {
            await runtimeDevice2.stop();
            await session.transportServices.identityDeletionProcesses.initiateIdentityDeletionProcess();
            expect(sessionDevice2.account.deletionDate).toBeUndefined();

            await runtimeDevice2.start();
            await sessionDevice2.transportServices.account.syncDatawallet();
            expect(sessionDevice2.account.deletionDate).toBeDefined();
        });
    });
});
