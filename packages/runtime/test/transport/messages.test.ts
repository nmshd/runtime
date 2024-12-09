import { ConsumptionIds } from "@nmshd/consumption";
import { ConsentRequestItemJSON, Notification } from "@nmshd/content";
import { CoreDate } from "@nmshd/core-types";
import assert from "assert";
import {
    AttributeDeletedEvent,
    GetMessagesQuery,
    IdentityDeletionProcessStatus,
    LocalAttributeDeletionStatus,
    LocalRequestDTO,
    MessageReceivedEvent,
    MessageSentEvent,
    MessageWasReadAtChangedEvent,
    OwnSharedAttributeDeletedByOwnerEvent,
    OwnSharedAttributeSucceededEvent,
    PeerDeletionCancelledEvent,
    PeerToBeDeletedEvent,
    RelationshipStatus
} from "../../src";
import {
    emptyRelationshipCreationContent,
    ensureActiveRelationship,
    establishRelationship,
    exchangeMessage,
    exchangeMessageWithAttachment,
    exchangeTemplate,
    executeFullCreateAndShareRepositoryAttributeFlow,
    QueryParamConditions,
    reactivateTerminatedRelationship,
    RuntimeServiceProvider,
    sendMessage,
    syncUntilHasEvent,
    syncUntilHasMessage,
    syncUntilHasMessages,
    syncUntilHasMessageWithNotification,
    syncUntilHasRelationships,
    TestNotificationItem,
    TestRuntimeServices,
    uploadFile
} from "../lib";

const serviceProvider = new RuntimeServiceProvider();
let client1: TestRuntimeServices;
let client2: TestRuntimeServices;
let client3: TestRuntimeServices;
let client4: TestRuntimeServices;
let client5: TestRuntimeServices;

beforeAll(async () => {
    const runtimeServices = await serviceProvider.launch(5, {
        enableRequestModule: true,
        enableDeciderModule: true,
        enableNotificationModule: true
    });
    client1 = runtimeServices[0];
    client2 = runtimeServices[1];
    client3 = runtimeServices[2];
    client4 = runtimeServices[3];
    client5 = runtimeServices[4];
    await ensureActiveRelationship(client1.transport, client2.transport);
    await ensureActiveRelationship(client1.transport, client3.transport);
}, 30000);

beforeEach(() => {
    client1.eventBus.reset();
});

afterAll(() => serviceProvider.stop());

describe("Messaging", () => {
    let fileId: string;

    beforeAll(async () => {
        const file = await uploadFile(client1.transport);
        fileId = file.id;
    });

    test("send a Message from client1.transport to client2.transport", async () => {
        expect(fileId).toBeDefined();

        const result = await client1.transport.messages.sendMessage({
            recipients: [client2.address],
            content: {
                "@type": "Mail",
                body: "b",
                cc: [],
                subject: "a",
                to: [client2.address]
            },
            attachments: [fileId]
        });
        expect(result).toBeSuccessful();
        await expect(client1.eventBus).toHavePublished(MessageSentEvent, (m) => m.data.id === result.value.id);
    });

    test("receive the message in a sync run", async () => {
        const messageId = (await sendMessage(client1.transport, client2.address, undefined, [fileId])).id;

        const message = await syncUntilHasMessage(client2.transport, messageId);
        await expect(client2.eventBus).toHavePublished(MessageReceivedEvent, (m) => m.data.id === messageId);

        expect(message.id).toStrictEqual(messageId);
        expect(message.content).toStrictEqual({
            "@type": "Mail",
            subject: "This is the mail subject",
            body: "This is the mail body",
            cc: [],
            to: [client2.address]
        });
    });

    test("receive the message on TransportService2 in /Messages", async () => {
        const baselineNumberOfMessages = (await client2.transport.messages.getMessages({})).value.length;
        const messageId = (await exchangeMessage(client1.transport, client2.transport, [fileId])).id;

        const response = await client2.transport.messages.getMessages({});
        expect(response).toBeSuccessful();
        const numberOfMessages = response.value.length;
        expect(numberOfMessages - baselineNumberOfMessages).toBe(1);

        const message = response.value[numberOfMessages - 1];
        expect(message.id).toStrictEqual(messageId);
        expect(message.content).toStrictEqual({
            "@type": "Mail",
            subject: "This is the mail subject",
            body: "This is the mail body",
            cc: [],
            to: [client2.address]
        });
    });

    test("receive the message on TransportService2 in /Messages/{id}", async () => {
        const messageId = (await exchangeMessage(client1.transport, client2.transport, [fileId])).id;

        const response = await client2.transport.messages.getMessage({ id: messageId });
        expect(response).toBeSuccessful();
    });

    test("send a Message to multiple recipients", async () => {
        expect(fileId).toBeDefined();

        const result = await client1.transport.messages.sendMessage({
            recipients: [client2.address, client3.address],
            content: {
                "@type": "Mail",
                body: "b",
                cc: [client3.address],
                subject: "a",
                to: [client2.address]
            },
            attachments: [fileId]
        });
        expect(result).toBeSuccessful();
        await expect(client1.eventBus).toHavePublished(MessageSentEvent, (m) => m.data.id === result.value.id);
    });
});

describe("Message errors", () => {
    let requestItem: ConsentRequestItemJSON;
    let createRequestResult: LocalRequestDTO;
    let requestId: string;

    beforeAll(async () => {
        requestItem = {
            "@type": "ConsentRequestItem",
            consent: "I consent to this RequestItem",
            mustBeAccepted: true
        };
        createRequestResult = (
            await client1.consumption.outgoingRequests.create({
                content: {
                    items: [requestItem]
                },
                peer: client2.address
            })
        ).value;
        requestId = createRequestResult.id;
    });

    test("should throw correct error for empty 'to' in the Message", async () => {
        const result = await client1.transport.messages.sendMessage({
            recipients: [client2.address],
            content: {
                "@type": "Mail",
                to: [],
                subject: "A Subject",
                body: "A Body"
            }
        });
        expect(result).toBeAnError("Mail.to:Array :: may not be empty", "error.runtime.requestDeserialization");
    });

    test("should throw correct error for missing 'to' in the Message", async () => {
        const result = await client1.transport.messages.sendMessage({
            recipients: [client2.address],
            content: {
                "@type": "Mail",
                subject: "A Subject",
                body: "A Body"
            }
        });
        expect(result).toBeAnError("Mail.to :: Value is not defined", "error.runtime.requestDeserialization");
    });

    test("should throw correct error for false content type", async () => {
        const result = await client1.transport.messages.sendMessage({
            recipients: [client2.address],
            content: {}
        });
        expect(result).toBeAnError("The content of a Message", "error.runtime.validation.invalidPropertyValue");
    });

    test("should throw correct error for missing Request ID in a Message with Request content", async () => {
        const result = await client1.transport.messages.sendMessage({
            recipients: [client2.address],
            content: {
                "@type": "Request",
                items: [requestItem]
            }
        });
        expect(result).toBeAnError("The Request must have an id.", "error.runtime.validation.invalidPropertyValue");
    });

    test("should throw correct error for missing LocalRequest trying to send a Message with Request content", async () => {
        const result = await client1.transport.messages.sendMessage({
            recipients: [client2.address],
            content: {
                "@type": "Request",
                id: "REQxxxxxxxxxxxxxxxxx",
                items: [requestItem]
            }
        });
        expect(result).toBeAnError(/.*/, "error.runtime.recordNotFound");
    });

    test("should throw correct error for trying to send a Message with Request content to multiple recipients", async () => {
        const result = await client1.transport.messages.sendMessage({
            recipients: [client2.address, client3.address],
            content: {
                "@type": "Request",
                id: requestId,
                items: [requestItem]
            }
        });
        expect(result).toBeAnError("Only one recipient is allowed for sending Requests.", "error.runtime.validation.invalidPropertyValue");
    });

    test("should throw correct error for trying to send a Message with a Request content that doesn't match the content of the LocalRequest", async () => {
        const wrongRequestItem = {
            "@type": "AuthenticationRequestItem",
            mustBeAccepted: true
        };
        const result = await client1.transport.messages.sendMessage({
            recipients: [client2.address],
            content: {
                "@type": "Request",
                id: requestId,
                items: [wrongRequestItem]
            }
        });
        expect(result).toBeAnError("The sent Request must have the same content as the LocalRequest.", "error.runtime.validation.invalidPropertyValue");
    });

    test("should throw correct error if Message's recipient doesn't match Request's peer", async () => {
        const result = await client1.transport.messages.sendMessage({
            recipients: [client3.address],
            content: {
                "@type": "Request",
                id: requestId,
                items: [requestItem]
            }
        });
        expect(result).toBeAnError("The recipient does not match the Request's peer.", "error.runtime.validation.invalidPropertyValue");
    });

    describe("Message errors for Relationships that are not active", () => {
        test("should throw correct error for trying to send a Message if there are recipients to which no Relationship exists", async () => {
            const result = await client1.transport.messages.sendMessage({
                recipients: [client4.address, client5.address],
                content: {
                    "@type": "Mail",
                    body: "b",
                    cc: [client4.address],
                    subject: "a",
                    to: [client5.address]
                }
            });
            expect(result).toBeAnError(/.*/, "error.runtime.messages.hasNoActiveRelationship");
            expect(result.error.message).toBe(
                `The Message cannot be sent as there is no active Relationship to the recipient(s) with the following address(es): '${client4.address.toString()}', '${client5.address.toString()}'. However, please note that Messages whose content is a Notification can be sent on terminated Relationships as well.`
            );
        });

        test("should throw correct error for trying to send a Message if there are recipients to which only a pending Relationship exists", async () => {
            const templateId = (await exchangeTemplate(client1.transport, client4.transport)).id;

            await client4.transport.relationships.createRelationship({
                templateId: templateId,
                creationContent: emptyRelationshipCreationContent
            });

            const relationships = await syncUntilHasRelationships(client1.transport);
            expect(relationships[0].status).toBe(RelationshipStatus.Pending);

            const result = await client1.transport.messages.sendMessage({
                recipients: [client2.address, client4.address],
                content: {
                    "@type": "Mail",
                    body: "b",
                    cc: [client2.address],
                    subject: "a",
                    to: [client4.address]
                }
            });
            expect(result).toBeAnError(/.*/, "error.runtime.messages.hasNoActiveRelationship");
            expect(result.error.message).toBe(
                `The Message cannot be sent as there is no active Relationship to the recipient(s) with the following address(es): '${client4.address.toString()}'. However, please note that Messages whose content is a Notification can be sent on terminated Relationships as well.`
            );
        });

        test("should throw correct error for trying to send a Message whose content is not a Notification if there are recipients to which only a terminated Relationship exists", async () => {
            const getRelationshipResult = (await client1.transport.relationships.getRelationshipByAddress({ address: client3.address })).value;
            expect(getRelationshipResult.status).toBe(RelationshipStatus.Active);

            await client1.transport.relationships.terminateRelationship({ relationshipId: getRelationshipResult.id });
            const terminatedRelationship = (await syncUntilHasRelationships(client3.transport))[0];
            expect(terminatedRelationship.status).toBe(RelationshipStatus.Terminated);

            const result = await client1.transport.messages.sendMessage({
                recipients: [client3.address],
                content: {
                    "@type": "Mail",
                    body: "b",
                    cc: [],
                    subject: "a",
                    to: [client3.address]
                }
            });
            expect(result).toBeAnError(/.*/, "error.runtime.messages.hasNoActiveRelationship");
            expect(result.error.message).toBe(
                `The Message cannot be sent as there is no active Relationship to the recipient(s) with the following address(es): '${client3.address.toString()}'. However, please note that Messages whose content is a Notification can be sent on terminated Relationships as well.`
            );
        });

        test("should throw less restrictive transport error for trying to send a Message whose content is a Notification if there are recipients to which neither an active nor a terminated Relationship exists", async () => {
            const notificationId = await ConsumptionIds.notification.generate();
            const notificationToBeSent = Notification.from({ id: notificationId, items: [TestNotificationItem.from({})] });

            const result = await client1.transport.messages.sendMessage({
                recipients: [client5.address],
                content: notificationToBeSent.toJSON()
            });
            expect(result).toBeAnError(/.*/, "error.transport.messages.hasNeitherActiveNorTerminatedRelationship");
            expect(result.error.message).toContain(
                `The Message cannot be sent as there is neither an active nor a terminated Relationship to the recipient(s) with the following address(es): '${client5.address.toString()}'.`
            );
        });
    });

    describe("Message errors for peers that are in deletion", () => {
        let relationshipIdToClient2: string;

        beforeAll(async () => {
            relationshipIdToClient2 = (await client1.transport.relationships.getRelationshipByAddress({ address: client2.address })).value.id;
            await ensureActiveRelationship(client1.transport, client5.transport);
        });

        afterEach(async () => {
            const activeIdentityDeletionProcess = await client2.transport.identityDeletionProcesses.getActiveIdentityDeletionProcess();
            if (!activeIdentityDeletionProcess.isSuccess) {
                return;
            }
            let abortResult;
            if (activeIdentityDeletionProcess.value.status === IdentityDeletionProcessStatus.Approved) {
                abortResult = await client2.transport.identityDeletionProcesses.cancelIdentityDeletionProcess();
            } else if (activeIdentityDeletionProcess.value.status === IdentityDeletionProcessStatus.WaitingForApproval) {
                abortResult = await client2.transport.identityDeletionProcesses.rejectIdentityDeletionProcess();
            }
            await syncUntilHasEvent(client1, PeerDeletionCancelledEvent);
            if (abortResult?.isError) throw abortResult.error;
        });

        test("should throw correct error for Messages whose content is not a Notification if there are recipients in deletion", async () => {
            await client2.transport.identityDeletionProcesses.initiateIdentityDeletionProcess();
            await syncUntilHasEvent(client1, PeerToBeDeletedEvent, (e) => e.data.id === relationshipIdToClient2);

            const result = await client1.transport.messages.sendMessage({
                recipients: [client2.address],
                content: {
                    "@type": "ArbitraryMessageContent",
                    value: "aString"
                }
            });
            expect(result).toBeAnError(/.*/, "error.runtime.messages.peerIsInDeletion");
            expect(result.error.message).toBe(
                `The Message cannot be sent as the recipient(s) with the following address(es) being in deletion: '${client2.address.toString()}'. However, please note that Messages whose content is a Notification can be sent to recipients in deletion.`
            );
        });

        test("should throw correct error for Messages whose content is a Request if the recipient has initiated its deletion after the Request has been created", async () => {
            await client2.transport.identityDeletionProcesses.initiateIdentityDeletionProcess();
            await syncUntilHasEvent(client1, PeerToBeDeletedEvent, (e) => e.data.id === relationshipIdToClient2);
            await client1.eventBus.waitForRunningEventHandlers();

            const result = await client1.transport.messages.sendMessage({ recipients: [client2.address], content: createRequestResult.content });
            expect(result).toBeAnError(/.*/, "error.runtime.messages.peerIsInDeletion");
            expect(result.error.message).toBe(
                `The Message cannot be sent as the recipient(s) with the following address(es) being in deletion: '${client2.address.toString()}'. However, please note that Messages whose content is a Notification can be sent to recipients in deletion.`
            );
        });
    });
});

describe("Postponed Notifications via Messages", () => {
    beforeEach(() => {
        client1.eventBus.reset();
        client5.eventBus.reset();
    });

    describe("Postponed Notifications for reactivated Relationships", () => {
        let relationshipId: string;

        beforeAll(async () => {
            relationshipId = (await ensureActiveRelationship(client5.transport, client1.transport)).id;
        });

        test("should be able to send a Notification even though the Relationship is terminated and the recipient should receive it only after the reactiviation of the Relationship", async () => {
            await client1.transport.relationships.terminateRelationship({ relationshipId: relationshipId });
            const terminatedRelationship = (await syncUntilHasRelationships(client5.transport))[0];
            expect(terminatedRelationship.status).toBe(RelationshipStatus.Terminated);

            const notificationId = await ConsumptionIds.notification.generate();
            const notificationToBeSent = Notification.from({ id: notificationId, items: [TestNotificationItem.from({})] });
            const sendMessageResult = await client1.transport.messages.sendMessage({ recipients: [client5.address], content: notificationToBeSent.toJSON() });
            expect(sendMessageResult).toBeSuccessful();
            const notificationSentResult = await client1.consumption.notifications.sentNotification({ messageId: sendMessageResult.value.id });
            expect(notificationSentResult).toBeSuccessful();

            await client5.transport.account.syncEverything();
            const getMessagesResponse = await client5.transport.messages.getMessages({});
            expect(getMessagesResponse.value).toHaveLength(0);
            const getNotificationResponse = await client5.consumption.notifications.getNotification({ id: notificationId.toString() });
            expect(getNotificationResponse).toBeAnError(/.*/, "error.transport.recordNotFound");

            await reactivateTerminatedRelationship(client5.transport, client1.transport);

            const postponedMessages = await syncUntilHasMessages(client5.transport);
            expect(postponedMessages).toHaveLength(1);
            await client5.eventBus.waitForRunningEventHandlers();
            const postponedNotification = await client5.consumption.notifications.getNotification({ id: notificationId.toString() });
            expect(postponedNotification).toBeSuccessful();
        });

        test("should be able to receive Notifications sent on a terminated Relationship in the right order after the Relationship was reactivated", async () => {
            const ownSharedIdentityAttribute = await executeFullCreateAndShareRepositoryAttributeFlow(client1, client5, {
                content: {
                    value: {
                        "@type": "GivenName",
                        value: "A given name"
                    }
                }
            });

            await client1.transport.relationships.terminateRelationship({ relationshipId: relationshipId });
            const terminatedRelationship = (await syncUntilHasRelationships(client5.transport))[0];
            expect(terminatedRelationship.status).toBe(RelationshipStatus.Terminated);

            const { successor: successorOfRepositoryAttribute } = (
                await client1.consumption.attributes.succeedRepositoryAttribute({
                    predecessorId: (await client1.consumption.attributes.getRepositoryAttributes({})).value[0].id,
                    successorContent: {
                        value: {
                            "@type": "GivenName",
                            value: "A new given name"
                        }
                    }
                })
            ).value;

            const notifyAboutSuccessionResult = (
                await client1.consumption.attributes.notifyPeerAboutRepositoryAttributeSuccession({ attributeId: successorOfRepositoryAttribute.id, peer: client5.address })
            ).value;
            await client1.eventBus.waitForEvent(OwnSharedAttributeSucceededEvent);
            await client5.transport.account.syncEverything();
            const successionNotificationNotYetReceived = await client5.consumption.notifications.getNotification({ id: notifyAboutSuccessionResult.notificationId });
            expect(successionNotificationNotYetReceived).toBeAnError(/.*/, "error.transport.recordNotFound");

            const notifyAboutDeletionResult = (await client1.consumption.attributes.deleteOwnSharedAttributeAndNotifyPeer({ attributeId: ownSharedIdentityAttribute.id })).value;
            await client1.eventBus.waitForEvent(AttributeDeletedEvent);
            await client5.transport.account.syncEverything();
            const deletionNotificationNotYetReceived = await client5.consumption.notifications.getNotification({ id: notifyAboutDeletionResult.notificationId });
            expect(deletionNotificationNotYetReceived).toBeAnError(/.*/, "error.transport.recordNotFound");

            await client1.transport.relationships.requestRelationshipReactivation({ relationshipId: relationshipId });
            await syncUntilHasRelationships(client5.transport);
            const acceptReactivationResult = await client5.transport.relationships.acceptRelationshipReactivation({ relationshipId: relationshipId });
            expect(acceptReactivationResult.value.status).toBe(RelationshipStatus.Active);
            const timeOfAcceptanceOfReactivation = acceptReactivationResult.value.auditLog[acceptReactivationResult.value.auditLog.length - 1].createdAt;
            const reactivatedRelationship = await syncUntilHasRelationships(client1.transport);
            expect(reactivatedRelationship[reactivatedRelationship.length - 1].status).toBe(RelationshipStatus.Active);

            const postponedMessages = await syncUntilHasMessages(client5.transport);
            expect(postponedMessages).toHaveLength(2);

            const postponedSuccessionNotification = await client5.consumption.notifications.getNotification({ id: notifyAboutSuccessionResult.notificationId });
            expect(postponedSuccessionNotification).toBeSuccessful();
            const postponedDeletionNotification = await client5.consumption.notifications.getNotification({ id: notifyAboutDeletionResult.notificationId });
            expect(postponedDeletionNotification).toBeSuccessful();

            await client5.eventBus.waitForEvent(OwnSharedAttributeDeletedByOwnerEvent);

            const peerSharedIdentityAttribute = (await client5.consumption.attributes.getAttribute({ id: ownSharedIdentityAttribute.id })).value;
            assert(peerSharedIdentityAttribute.succeededBy);
            assert(peerSharedIdentityAttribute.deletionInfo?.deletionDate);
            assert(peerSharedIdentityAttribute.deletionInfo.deletionStatus, LocalAttributeDeletionStatus.DeletedByOwner);

            const timeOfSuccession = (await client5.consumption.attributes.getAttribute({ id: peerSharedIdentityAttribute.succeededBy })).value.createdAt;
            const timeOfDeletionByOwner = peerSharedIdentityAttribute.deletionInfo.deletionDate;
            expect(CoreDate.from(timeOfAcceptanceOfReactivation).isBefore(CoreDate.from(timeOfSuccession))).toBe(true);
            expect(CoreDate.from(timeOfSuccession).isBefore(CoreDate.from(timeOfDeletionByOwner))).toBe(true);
        });
    });

    describe("Postponed Notifications for cancelled Identity deletion of recipient", () => {
        let relationshipId: string;

        beforeAll(async () => {
            relationshipId = (await ensureActiveRelationship(client5.transport, client1.transport)).id;
        });

        afterEach(async () => {
            const activeIdentityDeletionProcess = await client1.transport.identityDeletionProcesses.getActiveIdentityDeletionProcess();
            if (!activeIdentityDeletionProcess.isSuccess) {
                return;
            }
            let abortResult;
            if (activeIdentityDeletionProcess.value.status === IdentityDeletionProcessStatus.Approved) {
                abortResult = await client1.transport.identityDeletionProcesses.cancelIdentityDeletionProcess();
            } else if (activeIdentityDeletionProcess.value.status === IdentityDeletionProcessStatus.WaitingForApproval) {
                abortResult = await client1.transport.identityDeletionProcesses.rejectIdentityDeletionProcess();
            }
            await syncUntilHasEvent(client5, PeerDeletionCancelledEvent, (e) => e.data.id === relationshipId);
            if (abortResult?.isError) throw abortResult.error;
        });

        test("should be able to send a Notification even though the recipient is in deletion", async () => {
            await client1.transport.identityDeletionProcesses.initiateIdentityDeletionProcess();
            await syncUntilHasEvent(client5, PeerToBeDeletedEvent, (e) => e.data.id === relationshipId);
            await client5.eventBus.waitForRunningEventHandlers();

            const updatedRelationship = (await client5.transport.relationships.getRelationship({ id: relationshipId })).value;
            expect(updatedRelationship.peerDeletionInfo?.deletionStatus).toBe("ToBeDeleted");

            const id = await ConsumptionIds.notification.generate();
            const notificationToSend = Notification.from({ id, items: [TestNotificationItem.from({})] });
            await expect(client5.transport.messages.sendMessage({ recipients: [client1.address], content: notificationToSend.toJSON() })).resolves.not.toThrow();
        });

        test("should be able to receive a Notification sent during its recipient was in deletion after the recipient cancelled its deletion process", async () => {
            await client1.transport.identityDeletionProcesses.initiateIdentityDeletionProcess();
            await syncUntilHasEvent(client5, PeerToBeDeletedEvent, (e) => e.data.id === relationshipId);
            await client5.eventBus.waitForRunningEventHandlers();

            const updatedRelationship = (await client5.transport.relationships.getRelationship({ id: relationshipId })).value;
            expect(updatedRelationship.peerDeletionInfo?.deletionStatus).toBe("ToBeDeleted");

            const id = await ConsumptionIds.notification.generate();
            const notificationToSend = Notification.from({ id, items: [TestNotificationItem.from({})] });

            const result = await client5.transport.messages.sendMessage({ recipients: [client1.address], content: notificationToSend.toJSON() });
            expect(result).toBeSuccessful();

            await client1.transport.identityDeletionProcesses.cancelIdentityDeletionProcess();
            await syncUntilHasEvent(client5, PeerDeletionCancelledEvent, (e) => e.data.id === relationshipId);
            await client5.eventBus.waitForRunningEventHandlers();

            const message = await syncUntilHasMessageWithNotification(client1.transport, id);

            const notification = await client1.consumption.notifications.receivedNotification({ messageId: message.id });
            expect(notification).toBeSuccessful();
        });
    });
});

describe("Mark Message as un-/read", () => {
    let messageId: string;
    beforeEach(async () => {
        const result = await client1.transport.messages.sendMessage({
            recipients: [client2.address],
            content: {
                "@type": "Mail",
                body: "A body",
                cc: [],
                subject: "A subject",
                to: [client2.address]
            }
        });
        messageId = result.value.id;
        await syncUntilHasMessage(client2.transport, messageId);
    });

    test("Mark Message as read", async () => {
        const messageResult = await client2.transport.messages.getMessage({ id: messageId });
        expect(messageResult).toBeSuccessful();
        const message = messageResult.value;
        expect(message.wasReadAt).toBeUndefined();

        const expectedReadTime = CoreDate.utc();
        const updatedMessageResult = await client2.transport.messages.markMessageAsRead({ id: messageId });

        const updatedMessage = updatedMessageResult.value;
        expect(updatedMessage.wasReadAt).toBeDefined();
        const actualReadTime = CoreDate.from(updatedMessage.wasReadAt!);
        expect(actualReadTime.isSameOrAfter(expectedReadTime)).toBe(true);

        await expect(client2.eventBus).toHavePublished(MessageWasReadAtChangedEvent, (m) => m.data.id === messageId);
    });

    test("Mark Message as unread", async () => {
        const messageResult = await client2.transport.messages.getMessage({ id: messageId });
        expect(messageResult).toBeSuccessful();
        const message = messageResult.value;
        expect(message.wasReadAt).toBeUndefined();

        await client2.transport.messages.markMessageAsRead({ id: messageId });
        // reset event bus to not have the event from the previous call
        client2.eventBus.reset();

        const updatedMessageResult = await client2.transport.messages.markMessageAsUnread({ id: messageId });

        const updatedMessage = updatedMessageResult.value;
        expect(updatedMessage.wasReadAt).toBeUndefined();

        await expect(client2.eventBus).toHavePublished(MessageWasReadAtChangedEvent, (m) => m.data.id === messageId);
    });
});

describe("Message query", () => {
    test("query messages", async () => {
        const message = await exchangeMessageWithAttachment(client1.transport, client2.transport);
        const updatedMessage = (await client2.transport.messages.markMessageAsRead({ id: message.id })).value;
        const conditions = new QueryParamConditions<GetMessagesQuery>(updatedMessage, client2.transport)
            .addDateSet("createdAt")
            .addStringSet("createdBy")
            .addDateSet("wasReadAt")
            .addStringSet("recipients.address", updatedMessage.recipients[0].address)
            .addStringSet("content.@type")
            .addStringSet("content.subject")
            .addStringSet("content.body")
            .addStringSet("createdByDevice")
            .addStringArraySet("attachments")
            .addStringSet("recipients.relationshipId")
            .addSingleCondition({
                key: "participant",
                value: [updatedMessage.createdBy, "did:e:a-domain:dids:0000000000000000000000"],
                expectedResult: true
            });

        await conditions.executeTests((c, q) => c.messages.getMessages({ query: q }));
    });

    test("query messages by relationship ids", async () => {
        const additionalRuntimeServices = await serviceProvider.launch(2);
        const recipient1 = additionalRuntimeServices[0].transport;
        const recipient2 = additionalRuntimeServices[1].transport;

        await establishRelationship(client1.transport, recipient1);
        await establishRelationship(client1.transport, recipient2);

        const addressRecipient1 = (await recipient1.account.getIdentityInfo()).value.address;
        const addressRecipient2 = (await recipient2.account.getIdentityInfo()).value.address;

        const relationshipToRecipient1 = await client1.transport.relationships.getRelationshipByAddress({ address: addressRecipient1 });
        const relationshipToRecipient2 = await client1.transport.relationships.getRelationshipByAddress({ address: addressRecipient2 });

        await sendMessage(client1.transport, addressRecipient1);
        await sendMessage(client1.transport, addressRecipient2);

        const messagesToRecipient1 = await client1.transport.messages.getMessages({ query: { "recipients.relationshipId": relationshipToRecipient1.value.id } });
        const messagesToRecipient2 = await client1.transport.messages.getMessages({ query: { "recipients.relationshipId": relationshipToRecipient2.value.id } });
        const messagesToRecipient1Or2 = await client1.transport.messages.getMessages({
            query: { "recipients.relationshipId": [relationshipToRecipient1.value.id, relationshipToRecipient2.value.id] }
        });

        expect(messagesToRecipient1.value).toHaveLength(1);
        expect(messagesToRecipient2.value).toHaveLength(1);
        expect(messagesToRecipient1Or2.value).toHaveLength(2);
    });

    test("query Messages withAttachments", async () => {
        const messageWithAttachment = await exchangeMessageWithAttachment(client1.transport, client2.transport);
        const messageWithoutAttachment = await exchangeMessage(client1.transport, client2.transport);

        const messages = await client2.transport.messages.getMessages({ query: { attachments: "+" } });

        expect(messages.value.every((m) => m.attachments.length > 0)).toBe(true);

        const messageIds = messages.value.map((m) => m.id);
        expect(messageIds).toContain(messageWithAttachment.id);
        expect(messageIds).not.toContain(messageWithoutAttachment.id);
    });
});
