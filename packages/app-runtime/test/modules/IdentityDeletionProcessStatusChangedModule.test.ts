import { IdentityDeletionProcessStatus, IdentityDeletionProcessStatusChangedEvent } from "@nmshd/runtime";
import { AppRuntime, LocalAccountDeletionDateChangedEvent, LocalAccountSession } from "../../src";
import { EventListener, TestUtil } from "../lib";

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

    test("should set the deletionDate of the LocalAccount initiating an IdentityDeletionProcess", async function () {
        expect(session.account.deletionDate).toBeUndefined();

        const initiateDeletionResult = await session.transportServices.identityDeletionProcesses.initiateIdentityDeletionProcess();

        expect(session.account.deletionDate).toBeDefined();
        expect(session.account.deletionDate).toBe(initiateDeletionResult.value.gracePeriodEndsAt);
    });

    test("should unset the deletionDate of the LocalAccount cancelling an IdentityDeletionProcess", async function () {
        await session.transportServices.identityDeletionProcesses.initiateIdentityDeletionProcess();
        expect(session.account.deletionDate).toBeDefined();

        await session.transportServices.identityDeletionProcesses.cancelIdentityDeletionProcess();
        expect(session.account.deletionDate).toBeUndefined();
    });

    test("should fire a LocalAccountDeletionDateChangedEvent initiating an IdentityDeletionProcess", async function () {
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
    });

    test("should fire a LocalAccountDeletionDateChangedEvent cancelling an IdentityDeletionProcess", async function () {
        await session.transportServices.identityDeletionProcesses.initiateIdentityDeletionProcess();
        await TestUtil.awaitEvent(runtime, LocalAccountDeletionDateChangedEvent);

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
    });
});
