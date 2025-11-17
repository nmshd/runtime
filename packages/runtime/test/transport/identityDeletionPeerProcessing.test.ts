import { PeerDeletionCancelledEvent, PeerDeletionStatus, PeerToBeDeletedEvent } from "@nmshd/runtime";
import { IdentityDeletionProcessStatus } from "@nmshd/transport";
import { establishRelationship, RuntimeServiceProvider, syncUntilHasEvent, TestRuntimeServices } from "../lib/index.js";

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

beforeEach(() => {
    services1.eventBus.reset();
    services2.eventBus.reset();
});

afterEach(async () => {
    const activeIdentityDeletionProcess = await services1.transport.identityDeletionProcesses.getActiveIdentityDeletionProcess();
    if (!activeIdentityDeletionProcess.isSuccess) {
        return;
    }
    let abortResult;
    if (activeIdentityDeletionProcess.value.status === IdentityDeletionProcessStatus.Active) {
        abortResult = await services1.transport.identityDeletionProcesses.cancelIdentityDeletionProcess();
    }
    await syncUntilHasEvent(services2, PeerDeletionCancelledEvent, (e) => e.data.id === relationshipId);

    if (abortResult?.isError) throw abortResult.error;
});

describe("IdentityDeletionProcess", () => {
    test("peer should be notified about started deletion process", async function () {
        await services1.transport.identityDeletionProcesses.initiateIdentityDeletionProcess();

        await syncUntilHasEvent(services2, PeerToBeDeletedEvent, (e) => e.data.id === relationshipId);
        await services2.eventBus.waitForRunningEventHandlers();

        const updatedRelationship = (await services2.transport.relationships.getRelationship({ id: relationshipId })).value;
        expect(updatedRelationship.peerDeletionInfo!.deletionStatus).toBe(PeerDeletionStatus.ToBeDeleted);
        expect(updatedRelationship.peerDeletionInfo!.deletionDate).toBeDefined();
    });

    test("peer should be notified about cancelled deletion process", async function () {
        await services1.transport.identityDeletionProcesses.initiateIdentityDeletionProcess();
        // This should not be necessary and can be removed once the Backbone external events arrive in the right order
        await syncUntilHasEvent(services2, PeerToBeDeletedEvent, (e) => e.data.id === relationshipId);

        await services1.transport.identityDeletionProcesses.cancelIdentityDeletionProcess();

        await syncUntilHasEvent(services2, PeerDeletionCancelledEvent, (e) => e.data.id === relationshipId);
        await services2.eventBus.waitForRunningEventHandlers();

        const updatedRelationship = (await services2.transport.relationships.getRelationship({ id: relationshipId })).value;
        expect(updatedRelationship.peerDeletionInfo).toBeUndefined();
    });
});
