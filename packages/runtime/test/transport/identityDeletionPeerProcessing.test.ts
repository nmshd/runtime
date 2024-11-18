import { ConsumptionIds } from "@nmshd/consumption";
import { Notification } from "@nmshd/content";
import { IdentityDeletionProcessStatus } from "@nmshd/transport";
import { PeerDeletionCancelledEvent, PeerDeletionStatus, PeerToBeDeletedEvent } from "../../src";
import {
    establishRelationship,
    RuntimeServiceProvider,
    sendMessageToMultipleRecipients,
    syncUntilHasEvent,
    syncUntilHasMessageWithNotification,
    TestNotificationItem,
    TestRuntimeServices
} from "../lib";

const serviceProvider = new RuntimeServiceProvider();
let services1: TestRuntimeServices;
let services2: TestRuntimeServices;
let services3: TestRuntimeServices;
let relationshipId: string;
let relationshipId2: string;

beforeAll(async () => {
    const runtimeServices = await serviceProvider.launch(3);
    services1 = runtimeServices[0];
    services2 = runtimeServices[1];
    services3 = runtimeServices[2];
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

    test("messages with multiple recipients should fail if one of the recipients is ToBeDeleted", async () => {
        await services1.transport.identityDeletionProcesses.initiateIdentityDeletionProcess();

        await syncUntilHasEvent(services2, PeerToBeDeletedEvent, (e) => e.data.id === relationshipId);
        await services2.eventBus.waitForRunningEventHandlers();

        const result = await sendMessageToMultipleRecipients(services2.transport, [services1.address, services3.address]);
        expect(result).toBeAnError(
            `The recipient with the address '${services1.address.toString()}' is in deletion, so you cannot send them a Message.`,
            "error.transport.messages.peerIsInDeletion"
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
            `The recipients with the following addresses '${services3.address.toString()},${services1.address.toString()}' are in deletion, so you cannot send them a Message.`,
            "error.transport.messages.peerIsInDeletion"
        );
    });

    test("returns error sending the Request when the peer has initiated an active IdentityDeletionProcess after the request has been created", async () => {
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
        expect(result).toBeSuccessful();

        await services1.transport.identityDeletionProcesses.initiateIdentityDeletionProcess();
        await syncUntilHasEvent(services2, PeerToBeDeletedEvent, (e) => e.data.id === relationshipId);
        await services2.eventBus.waitForRunningEventHandlers();

        const messageResult = await services2.transport.messages.sendMessage({ recipients: [services1.address], content: result.value.content });

        expect(messageResult).toBeAnError(
            `The recipient with the address '${services1.address.toString()}' is in deletion, so you cannot send them a Message.`,
            "error.transport.messages.peerIsInDeletion"
        );
    });

    test("should be able to send a Notification to an Identity which is in status 'ToBeDeleted'", async () => {
        await services1.transport.identityDeletionProcesses.initiateIdentityDeletionProcess();
        await syncUntilHasEvent(services2, PeerToBeDeletedEvent, (e) => e.data.id === relationshipId);
        await services2.eventBus.waitForRunningEventHandlers();

        const updatedRelationship = (await services2.transport.relationships.getRelationship({ id: relationshipId })).value;
        expect(updatedRelationship.peerDeletionInfo?.deletionStatus).toBe("ToBeDeleted");

        const id = await ConsumptionIds.notification.generate();
        const notificationToSend = Notification.from({ id, items: [TestNotificationItem.from({})] });
        const result = await services2.transport.messages.sendMessage({ recipients: [services1.address], content: notificationToSend.toJSON() });
        expect(result).toBeSuccessful();
    });

    test("should be able to receive a Notification after the IdentityDeletionProcess has been cancelled", async () => {
        await services1.transport.identityDeletionProcesses.initiateIdentityDeletionProcess();
        await syncUntilHasEvent(services2, PeerToBeDeletedEvent, (e) => e.data.id === relationshipId);
        await services2.eventBus.waitForRunningEventHandlers();

        const updatedRelationship = (await services2.transport.relationships.getRelationship({ id: relationshipId })).value;
        expect(updatedRelationship.peerDeletionInfo?.deletionStatus).toBe("ToBeDeleted");

        const id = await ConsumptionIds.notification.generate();
        const notificationToSend = Notification.from({ id, items: [TestNotificationItem.from({})] });

        const result = await services2.transport.messages.sendMessage({ recipients: [services1.address], content: notificationToSend.toJSON() });
        expect(result).toBeSuccessful();

        await services1.transport.identityDeletionProcesses.cancelIdentityDeletionProcess();
        await syncUntilHasEvent(services2, PeerDeletionCancelledEvent, (e) => e.data.id === relationshipId);
        await services2.eventBus.waitForRunningEventHandlers();

        const message = await syncUntilHasMessageWithNotification(services1.transport, id);

        const notification = await services1.consumption.notifications.receivedNotification({ messageId: message.id });
        expect(notification).toBeSuccessful();
    });
});
