import { Serializable } from "@js-soft/ts-serval";
import { IdentityDeletionProcessStatusChangedEvent } from "@nmshd/runtime";
import { AppRuntime, DatawalletSynchronizedEvent, LocalAccountDeletionDateChangedEvent, LocalAccountSession, RemoteNotificationEvent } from "../../src";
import { EventListener, TestUtil } from "../lib";

describe("IdentityDeletionProcessStatusChangedTest", function () {
    let runtime: AppRuntime;
    let session: LocalAccountSession;

    beforeAll(async function () {
        runtime = await TestUtil.createRuntime();
        await runtime.start();

        const accounts = await TestUtil.provideAccounts(runtime, 1);

        session = await runtime.selectAccount(accounts[0].id);
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

        await session.transportServices.identityDeletionProcesses.cancelIdentityDeletionProcess();
        expect(session.account.deletionDate).toBeUndefined();
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

    test("multiDevice information", async function () {
        const runtimeDevice2 = await TestUtil.createRuntime();
        await runtimeDevice2.start();
        // const accountsDevice2 = TestUtil.provideAccounts(runtimeDevice2, 1);

        const newDevice = await session.transportServices.devices.createDevice({ name: "test", isAdmin: true });
        const token = await session.transportServices.devices.getDeviceOnboardingToken({ id: newDevice.value.id, profileName: "Test" });
        // const value = Serializable.fromUnknown(token.value.content)
        const content: any = Serializable.fromUnknown(token.value.content);

        const [account2] = await runtimeDevice2.multiAccountController.onboardDevice(content.sharedSecret, "test");
        const session2 = await runtimeDevice2.selectAccount(account2.id.toString());
        // const account = await runtimeDevice2.accountServices.getAccount(accounts[0].id);

        const eventListener = new EventListener(runtime, [
            LocalAccountDeletionDateChangedEvent,
            IdentityDeletionProcessStatusChangedEvent,
            DatawalletSynchronizedEvent,
            RemoteNotificationEvent
        ]);
        eventListener.start();

        await session2.transportServices.identityDeletionProcesses.initiateIdentityDeletionProcess();

        eventListener.stop();
        const events = eventListener.getReceivedEvents();
        // expect(events).toHaveLength(2);

        // runtimeDevice2.nativeEnvironment.eventBus.publish(
        //     new RemoteNotificationEvent({
        //         content: {
        //             devicePushIdentifier: accounts[0].devicePushIdentifier,
        //             eventName: "DatawalletModificationsCreated",
        //             sentAt: new Date().toISOString(),
        //             payload: {}
        //         }
        //     })
        // );

        // const event = await TestUtil.awaitEvent(runtimeDevice2, DatawalletSynchronizedEvent);
        // const event = await TestUtil.awaitEvent(runtimeDevice2, LocalAccountDeletionDateChangedEvent);

        // expect(event).toBeDefined();
        // console.log(event);
        // const session2 = await runtimeDevice2.selectAccount(device.id.toString());

        // const account = await runtimeDevice2.accountServices.getAccount(accounts[0].id);
        // console.log(session2);

        await runtimeDevice2.stop();
    });
});
