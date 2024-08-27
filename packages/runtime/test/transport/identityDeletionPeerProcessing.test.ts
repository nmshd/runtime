import { IdentityDeletionProcessStatus } from "@nmshd/transport";
import { PeerDeletionCancelledEvent, PeerDeletionStatus, PeerToBeDeletedEvent } from "../../src";
import { establishRelationship, resetEventBusAndSyncUntilHasEvent, RuntimeServiceProvider, TestRuntimeServices } from "../lib";

const serviceProvider = new RuntimeServiceProvider();
let services1: TestRuntimeServices;
let services2: TestRuntimeServices;
let relationshipId: string;

beforeAll(async () => {
    const runtimeServices = await serviceProvider.launch(2);
    services1 = runtimeServices[0];
    services2 = runtimeServices[1];
    relationshipId = (await establishRelationship(services1.transport, services2.transport)).id;
}, 30000);

afterAll(async () => {
    return await serviceProvider.stop();
});

afterEach(async () => {
    const activeIdentityDeletionProcess = await services1.transport.identityDeletionProcesses.getActiveIdentityDeletionProcess();
    if (!activeIdentityDeletionProcess.isSuccess) {
        return;
    }
    let abortResult;
    if (activeIdentityDeletionProcess.value.status === IdentityDeletionProcessStatus.Approved) {
        abortResult = await services1.transport.identityDeletionProcesses.cancelIdentityDeletionProcess();
    } else if (activeIdentityDeletionProcess.value.status === IdentityDeletionProcessStatus.WaitingForApproval) {
        abortResult = await services1.transport.identityDeletionProcesses.rejectIdentityDeletionProcess();
    }

    if (abortResult?.isError) throw abortResult.error;
});

describe("IdentityDeletionProcess", () => {
    test("peer should be notified about started deletion process", async function () {
        await services1.transport.identityDeletionProcesses.initiateIdentityDeletionProcess();

        const event = (await resetEventBusAndSyncUntilHasEvent(services2, PeerToBeDeletedEvent, (e) => e.data.id === relationshipId)) as PeerToBeDeletedEvent;
        expect(event.data.peerDeletionInfo!.deletionStatus).toBe(PeerDeletionStatus.ToBeDeleted);
    });

    test("peer should be notified about cancelled deletion process", async function () {
        await services1.transport.identityDeletionProcesses.initiateIdentityDeletionProcess();
        await resetEventBusAndSyncUntilHasEvent(services2, PeerToBeDeletedEvent, (e) => e.data.id === relationshipId);

        await services1.transport.identityDeletionProcesses.cancelIdentityDeletionProcess();
        const event = (await resetEventBusAndSyncUntilHasEvent(services2, PeerDeletionCancelledEvent, (e) => e.data.id === relationshipId)) as PeerDeletionCancelledEvent;
        expect(event.data.peerDeletionInfo).toBeUndefined();
    });
});
