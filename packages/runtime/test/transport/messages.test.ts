import { ConsumptionIds } from "@nmshd/consumption";
import { ConsentRequestItemJSON, Notification, ResponseWrapperJSON, ShareAttributeAcceptResponseItemJSON } from "@nmshd/content";
import { CoreDate, CoreId } from "@nmshd/core-types";
import {
    GetMessagesQuery,
    IncomingRequestStatusChangedEvent,
    LocalRequestStatus,
    MessageDTO,
    MessageReceivedEvent,
    MessageSentEvent,
    MessageWasReadAtChangedEvent,
    OutgoingRequestStatusChangedEvent,
    OwnSharedAttributeSucceededEvent,
    RelationshipReactivationCompletedEvent,
    RelationshipStatus,
    ShareRepositoryAttributeRequest
} from "../../src";
import {
    emptyRelationshipCreationContent,
    ensureActiveRelationship,
    establishRelationship,
    exchangeMessage,
    exchangeMessageWithAttachment,
    exchangeTemplate,
    QueryParamConditions,
    RuntimeServiceProvider,
    sendMessage,
    syncUntilHasEvent,
    syncUntilHasMessage,
    syncUntilHasMessages,
    syncUntilHasMessageWithRequest,
    syncUntilHasMessageWithResponse,
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
    const runtimeServices = await serviceProvider.launch(5);
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
    let requestId: string;
    let relationshipIdToClient5: string;
    let notificationId: CoreId;
    beforeAll(async () => {
        requestItem = {
            "@type": "ConsentRequestItem",
            consent: "I consent to this RequestItem",
            mustBeAccepted: true
        };
        const createRequestResult = await client1.consumption.outgoingRequests.create({
            content: {
                items: [requestItem]
            },
            peer: client2.address
        });
        requestId = createRequestResult.value.id;
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

    test("messages with multiple recipients should fail if there is no active Relationship to the recipients", async () => {
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
        expect(result).toBeAnError(
            `An active Relationship with the given addresses '${client4.address.toString()},${client5.address.toString()}' does not exist, so you cannot send them a Message.`,
            "error.transport.messages.hasNoActiveRelationship"
        );
    });

    test("messages with multiple recipients should also fail if only one Relationship is missing", async () => {
        const result = await client1.transport.messages.sendMessage({
            recipients: [client2.address, client5.address],
            content: {
                "@type": "Mail",
                body: "b",
                cc: [client2.address],
                subject: "a",
                to: [client5.address]
            }
        });
        expect(result).toBeAnError(
            `An active Relationship with the given address '${client5.address.toString()}' does not exist, so you cannot send them a Message.`,
            "error.transport.messages.hasNoActiveRelationship"
        );
    });

    test("messages with multiple recipients should also fail if only one Relationship is pending", async () => {
        const templateId = (await exchangeTemplate(client1.transport, client4.transport)).id;

        const createRelationshipResponse = await client4.transport.relationships.createRelationship({
            templateId: templateId,
            creationContent: emptyRelationshipCreationContent
        });
        expect(createRelationshipResponse).toBeSuccessful();

        const relationships1 = await syncUntilHasRelationships(client1.transport);
        expect(relationships1).toHaveLength(1);

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

        expect(result).toBeAnError(
            `An active Relationship with the given address '${client4.address.toString()}' does not exist, so you cannot send them a Message.`,
            "error.transport.messages.hasNoActiveRelationship"
        );
    });

    test("should not send a message when the Relationship is terminated", async () => {
        relationshipIdToClient5 = (await ensureActiveRelationship(client5.transport, client1.transport)).id;
        const getRelationshipsResult = await client5.transport.relationships.getRelationships({});
        expect(getRelationshipsResult).toBeSuccessful();
        expect(getRelationshipsResult.value).toHaveLength(1);
        expect(getRelationshipsResult.value[0].status).toBe(RelationshipStatus.Active);

        await client1.transport.relationships.terminateRelationship({ relationshipId: relationshipIdToClient5 });
        const syncedRelationship = (await syncUntilHasRelationships(client5.transport))[0];
        expect(syncedRelationship.status).toBe(RelationshipStatus.Terminated);

        const result = await client1.transport.messages.sendMessage({
            recipients: [client5.address],
            content: {
                "@type": "Mail",
                body: "b",
                cc: [],
                subject: "a",
                to: [client5.address]
            }
        });
        expect(result).toBeAnError(/.*/, "error.transport.messages.hasNoActiveRelationship");
    });

    test("should be able to send a Notification when the Relationship is terminated", async () => {
        notificationId = await ConsumptionIds.notification.generate();
        const notificationToSend = Notification.from({ id: notificationId, items: [TestNotificationItem.from({})] });

        const result = await client1.transport.messages.sendMessage({ recipients: [client5.address], content: notificationToSend.toJSON() });
        expect(result).toBeSuccessful();

        const notificationSent = await client1.consumption.notifications.sentNotification({ messageId: result.value.id });
        expect(notificationSent).toBeSuccessful();

        const response = await client5.transport.messages.getMessages({});
        expect(response).toBeSuccessful();
        expect(response.value.length === 0).toBe(true);

        const getNotificationResult1 = await client5.consumption.notifications.getNotification({ id: notificationId.toString() });
        expect(getNotificationResult1).toBeAnError(/.*/, "error.transport.recordNotFound");
    });

    test("should be able to send a Notification and the peer should receive the Notification only after the reactiviation of the Relationship", async () => {
        await client1.transport.relationships.requestRelationshipReactivation({ relationshipId: relationshipIdToClient5 });
        await syncUntilHasRelationships(client5.transport);

        const acceptanceResult = await client5.transport.relationships.acceptRelationshipReactivation({ relationshipId: relationshipIdToClient5 });
        expect(acceptanceResult).toBeSuccessful();
        expect(acceptanceResult.value.status).toBe(RelationshipStatus.Active);

        const relationship1 = await syncUntilHasRelationships(client1.transport);
        expect(relationship1[relationship1.length - 1].status).toBe(RelationshipStatus.Active);

        await syncUntilHasEvent(client1, RelationshipReactivationCompletedEvent, (e) => e.data.id === relationshipIdToClient5);
        await client1.eventBus.waitForRunningEventHandlers();

        await syncUntilHasEvent(client5, RelationshipReactivationCompletedEvent, (e) => e.data.id === relationshipIdToClient5);
        await client5.eventBus.waitForRunningEventHandlers();

        const response = await client5.transport.messages.getMessages({});
        expect(response).toBeSuccessful();
        expect(response.value.length === 1).toBe(true);

        const notification = await client5.consumption.notifications.receivedNotification({ messageId: response.value[response.value.length - 1].id });
        expect(notification).toBeSuccessful();
        expect(notification.value.id.toString() === notificationId.toString()).toBe(true);

        const getNotificationResult0 = await client5.consumption.notifications.getNotification({ id: notificationId.toString() });
        expect(getNotificationResult0).toBeSuccessful();
    });

    test("should be able to send Notifications and the peer should receive the Notifications in the right order after the reactiviation of the Relationship", async () => {
        const ownSharedIdentityAttribute = (
            await client1.consumption.attributes.createRepositoryAttribute({
                content: {
                    value: {
                        "@type": "GivenName",
                        value: "Own name"
                    }
                }
            })
        ).value;

        const createdAttribute = client1.consumption.attributes.getAttribute({ id: ownSharedIdentityAttribute.id });
        expect(createdAttribute).toBeDefined();

        const shareRequest: ShareRepositoryAttributeRequest = {
            attributeId: ownSharedIdentityAttribute.id,
            peer: client5.address
        };
        const shareRequestResult = await client1.consumption.attributes.shareRepositoryAttribute(shareRequest);
        expect(shareRequestResult.isSuccess).toBe(true);

        const shareMessage = await syncUntilHasMessageWithRequest(client5.transport, shareRequestResult.value.id);
        expect(shareMessage.id).toBeDefined();

        await client1.consumption.outgoingRequests.sent({ requestId: shareRequestResult.value.id, messageId: shareMessage.id });

        await client5.consumption.incomingRequests.received({
            receivedRequest: shareMessage.content,
            requestSourceId: shareMessage.id
        });

        await client5.consumption.incomingRequests.checkPrerequisites({
            requestId: shareMessage.content.id!
        });

        await client5.consumption.incomingRequests.requireManualDecision({
            requestId: shareMessage.content.id!
        });

        await client5.eventBus.waitForEvent(IncomingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.ManualDecisionRequired);

        const shareRequestId = shareRequestResult.value.id;
        expect(shareRequestId).toBeDefined();

        const acceptedRequest = await client5.consumption.incomingRequests.accept({ requestId: shareMessage.content.id!, items: [{ accept: true }] });
        expect(acceptedRequest.isSuccess).toBe(true);

        const rResponseMessage = (
            await client5.transport.messages.sendMessage({
                content: {
                    "@type": "ResponseWrapper",
                    requestId: shareRequestId,
                    requestSourceReference: shareMessage.id,
                    requestSourceType: "Message",
                    response: acceptedRequest.value.response!.content
                },
                recipients: [(await client1.transport.account.getIdentityInfo()).value.address]
            })
        ).value as MessageDTO & { content: ResponseWrapperJSON };
        expect(rResponseMessage).toBeDefined();

        await client5.consumption.incomingRequests.complete({
            requestId: rResponseMessage.content.requestId,
            responseSourceId: rResponseMessage.id
        });

        const sResponseMessage = await syncUntilHasMessageWithResponse(client1.transport, shareRequestId);

        await client1.consumption.outgoingRequests.complete({
            messageId: sResponseMessage.id,
            receivedResponse: sResponseMessage.content.response
        });
        await client1.eventBus.waitForEvent(OutgoingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.Completed);

        const sharedAttributeId = (sResponseMessage.content.response.items[0] as ShareAttributeAcceptResponseItemJSON).attributeId;

        const sharedAttribute = (await client5.consumption.attributes.getAttribute({ id: sharedAttributeId })).value;
        expect(sharedAttribute.shareInfo).toBeDefined();
        const sharedAttribute1 = (await client1.consumption.attributes.getAttribute({ id: sharedAttributeId })).value;
        expect(sharedAttribute1).toBeDefined();

        await client1.transport.relationships.terminateRelationship({ relationshipId: relationshipIdToClient5 });
        const syncedRelationship = (await syncUntilHasRelationships(client5.transport))[0];
        expect(syncedRelationship.status).toBe(RelationshipStatus.Terminated);

        const { successor: ownSharedIdentityAttributeV1 } = (
            await client1.consumption.attributes.succeedRepositoryAttribute({
                predecessorId: ownSharedIdentityAttribute.id,
                successorContent: {
                    value: {
                        "@type": "GivenName",
                        value: "New own name"
                    }
                }
            })
        ).value;
        expect(ownSharedIdentityAttributeV1).toBeDefined();

        const result = await client1.consumption.attributes.notifyPeerAboutRepositoryAttributeSuccession({
            attributeId: ownSharedIdentityAttributeV1.id,
            peer: client5.address
        });
        expect(result).toBeSuccessful();

        await client1.eventBus.waitForEvent(OwnSharedAttributeSucceededEvent, (e) => {
            return e.data.successor.id === result.value.successor.id;
        });

        const notification = await client5.consumption.notifications.getNotification({ id: result.value.notificationId });
        expect(notification).toBeAnError(/.*/, "error.transport.recordNotFound");
        const succeededAttribute = await client5.consumption.attributes.getAttribute({ id: sharedAttributeId });
        expect(succeededAttribute.value.succeededBy).toBeUndefined();

        const resultDeletion = await client1.consumption.attributes.deleteOwnSharedAttributeAndNotifyPeer({ attributeId: sharedAttributeId });
        expect(resultDeletion).toBeSuccessful();

        await client1.transport.relationships.requestRelationshipReactivation({ relationshipId: relationshipIdToClient5 });
        await syncUntilHasRelationships(client5.transport);

        const acceptanceResult = await client5.transport.relationships.acceptRelationshipReactivation({ relationshipId: relationshipIdToClient5 });
        expect(acceptanceResult).toBeSuccessful();
        expect(acceptanceResult.value.status).toBe(RelationshipStatus.Active);

        const relationship1 = await syncUntilHasRelationships(client1.transport);
        expect(relationship1[relationship1.length - 1].status).toBe(RelationshipStatus.Active);

        const messages = await syncUntilHasMessages(client5.transport);
        expect(messages.length === 2).toBe(true);

        const notification0 = await client5.consumption.notifications.receivedNotification({ messageId: messages[0].id });
        expect(notification0).toBeSuccessful();

        const notification1 = await client5.consumption.notifications.receivedNotification({ messageId: messages[1].id });
        expect(notification1).toBeSuccessful();

        await client5.consumption.notifications.processNotificationById({ notificationId: notification0.value.id });

        const createdAttribute0 = await client5.consumption.attributes.getAttribute({ id: sharedAttributeId });
        expect(createdAttribute0.value.succeededBy).toBeDefined();
        expect(createdAttribute0.value.deletionInfo).toBeUndefined();

        await client5.consumption.notifications.processNotificationById({ notificationId: notification1.value.id });

        const createdAttribute1 = await client5.consumption.attributes.getAttribute({ id: sharedAttributeId });
        expect(createdAttribute1.value.succeededBy).toBeDefined();
        expect(createdAttribute1.value.deletionInfo).toBeDefined();

        const successor = await client5.consumption.attributes.getAttribute({ id: createdAttribute1.value.succeededBy! });
        expect(successor).toBeDefined();

        expect(CoreDate.from(acceptanceResult.value.auditLog[acceptanceResult.value.auditLog.length - 1].createdAt).isBefore(CoreDate.from(successor.value.createdAt))).toBe(true);

        expect(CoreDate.from(successor.value.createdAt).isBefore(CoreDate.from(createdAttribute1.value.deletionInfo!.deletionDate))).toBe(true);
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
