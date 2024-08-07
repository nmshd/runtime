import { IdentityDeletionProcessStatus } from "@nmshd/transport";
import { PeerDeletedEvent, PeerDeletionCancelledEvent, PeerStatus, PeerToBeDeletedEvent } from "../../src";
import { establishRelationship, RuntimeServiceProvider, TestRuntimeServices, waitForEvent } from "../lib";

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

beforeEach(() => {
    services2.eventBus.reset();
});

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
        await services1.transport.identityDeletionProcesses.approveIdentityDeletionProcess();

        await waitForEvent(services2.eventBus, PeerToBeDeletedEvent);
        await expect(services2.eventBus).toHavePublished(PeerToBeDeletedEvent, (e) => e.data.id === relationshipId && e.data.peerStatus === PeerStatus.ToBeDeleted);
    });

    test("peer should be notified about cancelled deletion process", async function () {
        await services1.transport.identityDeletionProcesses.initiateIdentityDeletionProcess();
        services2.eventBus.reset();
        await services1.transport.identityDeletionProcesses.approveIdentityDeletionProcess();
        await services1.transport.identityDeletionProcesses.cancelIdentityDeletionProcess();

        await waitForEvent(services2.eventBus, PeerDeletionCancelledEvent);
        await expect(services2.eventBus).toHavePublished(PeerDeletionCancelledEvent, (e) => e.data.id === relationshipId && e.data.peerStatus === PeerStatus.Active);
    });

    test.skip("peer should be notified about completed deletion process", async function () {
        await services1.transport.identityDeletionProcesses.initiateIdentityDeletionProcess();
        services2.eventBus.reset();

        await waitForEvent(services2.eventBus, PeerDeletedEvent, undefined, 10000);
        await expect(services2.eventBus).toHavePublished(PeerDeletedEvent, (e) => e.data.id === relationshipId && e.data.peerStatus === PeerStatus.Deleted);
    });
});
