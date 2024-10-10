import { IdentityDeletionProcessStatus } from "@nmshd/transport";
import { PeerDeletionCancelledEvent, PeerDeletionStatus, PeerToBeDeletedEvent } from "../../src";
import { establishRelationship, exchangeMessageWithRequest, RuntimeServiceProvider, sendMessageToMultipleRecipients, syncUntilHasEvent, TestRuntimeServices } from "../lib";

const serviceProvider = new RuntimeServiceProvider();
let services1: TestRuntimeServices;
let services2: TestRuntimeServices;
let services3: TestRuntimeServices;
let services4: TestRuntimeServices;
let relationshipId: string;
let relationshipId2: string;

beforeAll(async () => {
    const runtimeServices = await serviceProvider.launch(4, { enableRequestModule: true, enableDeciderModule: true, enableNotificationModule: true });
    services1 = runtimeServices[0];
    services2 = runtimeServices[1];
    services3 = runtimeServices[2];
    services4 = runtimeServices[3];
    relationshipId = (await establishRelationship(services1.transport, services2.transport)).id;
    relationshipId2 = (await establishRelationship(services3.transport, services2.transport)).id;
}, 30000);

afterAll(async () => {
    return await serviceProvider.stop();
});

beforeEach(() => {
    services1.eventBus.reset();
    services2.eventBus.reset();
    services3.eventBus.reset();
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
        // This should not be necessary and can be removed once the backbone external events arrive in the right order
        await syncUntilHasEvent(services2, PeerToBeDeletedEvent, (e) => e.data.id === relationshipId);

        await services1.transport.identityDeletionProcesses.cancelIdentityDeletionProcess();

        await syncUntilHasEvent(services2, PeerDeletionCancelledEvent, (e) => e.data.id === relationshipId);
        await services2.eventBus.waitForRunningEventHandlers();

        const updatedRelationship = (await services2.transport.relationships.getRelationship({ id: relationshipId })).value;
        expect(updatedRelationship.peerDeletionInfo).toBeUndefined();
    });

    test("messages with multiple recipients should fail if one of the recipients has an active IdentityDeletionProcess and with the other there is no relationship", async () => {
        await services1.transport.identityDeletionProcesses.initiateIdentityDeletionProcess();

        await syncUntilHasEvent(services2, PeerToBeDeletedEvent, (e) => e.data.id === relationshipId);
        await services2.eventBus.waitForRunningEventHandlers();

        const result = await sendMessageToMultipleRecipients(services2.transport, [services1.address, services4.address]);
        expect(result).toBeAnError(
            `The recipient with the address '${services1.address.toString()}' has an active IdentityDeletionProcess, so you cannot send them a Message.`,
            "error.transport.messages.peerInDeletion"
        );
    });

    test("messages with multiple recipients should fail with another ErrorMessage if more than one of the recipients has an active IdentityDeletionProcess", async () => {
        await services1.transport.identityDeletionProcesses.initiateIdentityDeletionProcess();

        await syncUntilHasEvent(services2, PeerToBeDeletedEvent, (e) => e.data.id === relationshipId);
        await services2.eventBus.waitForRunningEventHandlers();

        await services3.transport.identityDeletionProcesses.initiateIdentityDeletionProcess();

        await syncUntilHasEvent(services2, PeerToBeDeletedEvent, (e) => e.data.id === relationshipId2);
        await services2.eventBus.waitForRunningEventHandlers();

        const result = await sendMessageToMultipleRecipients(services2.transport, [services3.address, services1.address]);
        expect(result).toBeAnError(
            `The recipients with the following addresses '${services3.address.toString()},${services1.address.toString()}' have an active IdentityDeletionProcess, so you cannot send them a Message.`,
            "error.transport.messages.peerInDeletion"
        );
    });

    test("returns error if the peer of the Request has an active IdentityDeletionProcess", async () => {
        await services1.transport.identityDeletionProcesses.initiateIdentityDeletionProcess();

        await syncUntilHasEvent(services2, PeerToBeDeletedEvent, (e) => e.data.id === relationshipId);
        await services2.eventBus.waitForRunningEventHandlers();

        const requestContent = {
            content: {
                items: [
                    {
                        "@type": "TestRequestItem",
                        mustBeAccepted: false
                    }
                ]
            },
            peer: services1.address
        };
        const result = await services2.consumption.outgoingRequests.create(requestContent);
        expect(result).toBeAnError(
            `You cannot create a Request to '${services1.address.toString()}' since the peer is in status 'ToBeDeleted'.`,
            "error.consumption.requests.peerInDeletion"
        );
    });

    test("should not decide a request if the peer has an active IdentityDeletionProcess", async () => {
        const requestContent = {
            content: {
                items: [
                    {
                        "@type": "TestRequestItem",
                        mustBeAccepted: false
                    }
                ]
            },
            peer: services2.address
        };
        const rRequestMessage = await exchangeMessageWithRequest(services1, services2, requestContent);
        const result = await services2.consumption.incomingRequests.received({
            receivedRequest: rRequestMessage.content,
            requestSourceId: rRequestMessage.id
        });

        expect(result).toBeSuccessful();
        const requestIds = rRequestMessage.content.id!;
        const canAcceptResult = (await services2.consumption.incomingRequests.canAccept({ requestId: requestIds, items: [{ accept: true }] })).value;
        expect(canAcceptResult.isSuccess).toBe(true);

        await services1.transport.identityDeletionProcesses.initiateIdentityDeletionProcess();
        await syncUntilHasEvent(services2, PeerToBeDeletedEvent, (e) => e.data.id === relationshipId);
        await services2.eventBus.waitForRunningEventHandlers();
        const updatedRelationship2 = (await services2.transport.relationships.getRelationship({ id: relationshipId })).value;
        expect(updatedRelationship2.peerDeletionInfo?.deletionStatus).toBe("ToBeDeleted");

        const canAcceptResultAfterPeerDeletion = (await services2.consumption.incomingRequests.canAccept({ requestId: requestIds, items: [{ accept: true }] })).value;
        expect(canAcceptResultAfterPeerDeletion.isSuccess).toBe(false);
        expect(canAcceptResultAfterPeerDeletion.code).toBe("error.consumption.requests.peerInDeletion");
        expect(canAcceptResultAfterPeerDeletion.message).toContain(`You cannot decide a Request from '${services1.address.toString()}' since the peer is in status 'ToBeDeleted'`);
    });
});
