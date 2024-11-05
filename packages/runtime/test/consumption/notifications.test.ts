import { ConsumptionIds } from "@nmshd/consumption";
import { Notification } from "@nmshd/content";
import { CoreDate, CoreId } from "@nmshd/core-types";
import { CoreIdHelper } from "@nmshd/transport";
import {
    ConsumptionServices,
    LocalNotificationStatus,
    OwnSharedAttributeSucceededEvent,
    RelationshipReactivationCompletedEvent,
    RelationshipStatus,
    RuntimeErrors,
    TransportServices
} from "../../src";
import {
    establishRelationship,
    executeFullCreateAndShareRepositoryAttributeFlow,
    RuntimeServiceProvider,
    sendAndReceiveNotification,
    syncUntilHasEvent,
    syncUntilHasMessages,
    syncUntilHasMessageWithNotification,
    syncUntilHasRelationships,
    TestNotificationItem,
    TestNotificationItemProcessor,
    TestRuntimeServices
} from "../lib";

const runtimeServiceProvider = new RuntimeServiceProvider();
let sTransportServices: TransportServices;
let sConsumptionServices: ConsumptionServices;
let sRuntimeServices: TestRuntimeServices;

let rRuntimeServices: TestRuntimeServices;
let rTransportServices: TransportServices;
let rConsumptionServices: ConsumptionServices;
let rAddress: string;
let relationshipId: string;

beforeAll(async () => {
    const runtimeServices = await runtimeServiceProvider.launch(2, { enableRequestModule: true, enableDeciderModule: true });
    sRuntimeServices = runtimeServices[1];
    sTransportServices = runtimeServices[1].transport;
    sConsumptionServices = runtimeServices[1].consumption;

    rRuntimeServices = runtimeServices[0];
    rTransportServices = runtimeServices[0].transport;
    rConsumptionServices = runtimeServices[0].consumption;
    rAddress = (await rTransportServices.account.getIdentityInfo()).value.address;

    relationshipId = (await establishRelationship(sTransportServices, rTransportServices)).id;
}, 30000);
afterAll(async () => await runtimeServiceProvider.stop());

afterEach(async () => {
    // when have to process all open notifications to make sure that no tests are affected by any open notifications by other tests
    await rConsumptionServices.notifications.processOpenNotifactionsReceivedByCurrentDevice();
    TestNotificationItemProcessor.reset();
});

describe("Notifications", () => {
    test("sentNotification", async () => {
        const message = await sTransportServices.messages.sendMessage({
            recipients: [rAddress],
            content: Notification.from({ id: await ConsumptionIds.notification.generate(), items: [TestNotificationItem.from({})] }).toJSON()
        });

        const notification = await sConsumptionServices.notifications.sentNotification({ messageId: message.value.id });
        expect(notification).toBeSuccessful();

        const getNotificationResult = await sConsumptionServices.notifications.getNotification({ id: notification.value.id });
        expect(getNotificationResult).toBeSuccessful();
        expect(getNotificationResult.value.status).toStrictEqual(LocalNotificationStatus.Sent);
    });

    test("sent Notification with error", async () => {
        const id = await ConsumptionIds.notification.generate();
        const notificationToSend = Notification.from({ id, items: [TestNotificationItem.from({})] });
        await sTransportServices.messages.sendMessage({ recipients: [rAddress], content: notificationToSend.toJSON() });

        const message = await syncUntilHasMessageWithNotification(rTransportServices, id);
        const result = await rConsumptionServices.notifications.sentNotification({ messageId: message.id });
        expect(result).toBeAnError(
            RuntimeErrors.notifications.cannotSaveSentNotificationFromPeerMessage(CoreId.from(message.id)).message,
            "error.runtime.notifications.cannotSaveSentNotificationFromPeerMessage"
        );
    });

    test("receivedNotification", async () => {
        const id = await ConsumptionIds.notification.generate();
        const notificationToSend = Notification.from({ id, items: [TestNotificationItem.from({})] });
        await sTransportServices.messages.sendMessage({ recipients: [rAddress], content: notificationToSend.toJSON() });

        const message = await syncUntilHasMessageWithNotification(rTransportServices, id);

        const notification = await rConsumptionServices.notifications.receivedNotification({ messageId: message.id });
        expect(notification).toBeSuccessful();

        const getNotificationResult = await rConsumptionServices.notifications.getNotification({ id: notification.value.id });
        expect(getNotificationResult).toBeSuccessful();
        expect(getNotificationResult.value.status).toStrictEqual(LocalNotificationStatus.Open);
    });

    test("getNotifications", async () => {
        const notification = await sendAndReceiveNotification(sTransportServices, rTransportServices, rConsumptionServices);

        const notifications = await rConsumptionServices.notifications.getNotifications({});
        expect(notifications).toBeSuccessful();

        expect(notifications.value).toContainEqual(notification);
    });

    test("processOpenNotifactionsReceivedByCurrentDevice", async () => {
        const exchangedNotification = await sendAndReceiveNotification(sTransportServices, rTransportServices, rConsumptionServices);
        await rConsumptionServices.notifications.processOpenNotifactionsReceivedByCurrentDevice();

        const notification = await rConsumptionServices.notifications.getNotification({ id: exchangedNotification.id });
        expect(notification).toBeSuccessful();
        expect(notification.value.status).toStrictEqual(LocalNotificationStatus.Completed);

        expect(TestNotificationItemProcessor.processedItems).toHaveLength(1);
        expect(TestNotificationItemProcessor.rollbackedItems).toHaveLength(0);
    });

    test("processNotificationById", async () => {
        const exchangedNotification = await sendAndReceiveNotification(sTransportServices, rTransportServices, rConsumptionServices);
        await rConsumptionServices.notifications.processNotificationById({ notificationId: exchangedNotification.id });

        const notification = await rConsumptionServices.notifications.getNotification({ id: exchangedNotification.id });
        expect(notification).toBeSuccessful();
        expect(notification.value.status).toStrictEqual(LocalNotificationStatus.Completed);

        expect(TestNotificationItemProcessor.processedItems).toHaveLength(1);
        expect(TestNotificationItemProcessor.rollbackedItems).toHaveLength(0);
    });

    describe("errors and rollbacks", () => {
        test("wrong Notification id for getNotification", async () => {
            const result = await rConsumptionServices.notifications.getNotification({ id: "wrong-id" });
            expect(result).toBeAnError("id must match pattern NOT\\[A-Za-z0-9\\]\\{17\\}", "error.runtime.validation.invalidPropertyValue");
        });

        test("not existing Notification id for getNotification", async () => {
            const result = await rConsumptionServices.notifications.getNotification({ id: (await ConsumptionIds.notification.generate()).toString() });
            expect(result).toBeAnError("'LocalNotification' not found.", "error.transport.recordNotFound");
        });

        test("wrong Notification id for processNotificationById", async () => {
            const result = await rConsumptionServices.notifications.processNotificationById({ notificationId: "wrong-id" });
            expect(result).toBeAnError("notificationId must match pattern NOT\\[A-Za-z0-9\\]\\{17\\}", "error.runtime.validation.invalidPropertyValue");
        });

        test("not existing Notification id for processNotificationById", async () => {
            const result = await rConsumptionServices.notifications.processNotificationById({ notificationId: (await ConsumptionIds.notification.generate()).toString() });
            expect(result).toBeAnError("'LocalNotification' not found.", "error.transport.recordNotFound");
        });

        test("wrong Message ID for sentNotification", async () => {
            const result = await sConsumptionServices.notifications.sentNotification({ messageId: "wrong-id" });
            expect(result).toBeAnError("messageId must match pattern MSG\\[A-Za-z0-9\\]\\{17\\}", "error.runtime.validation.invalidPropertyValue");
        });

        test("not existing Message ID for sentNotification", async () => {
            const result = await sConsumptionServices.notifications.sentNotification({ messageId: (await new CoreIdHelper("MSG").generate()).toString() });
            expect(result).toBeAnError("Message not found. Make sure the ID exists and the record is not expired.", "error.runtime.recordNotFound");
        });

        test("wrong message id for receivedNotification", async () => {
            const result = await rConsumptionServices.notifications.receivedNotification({ messageId: "wrong-id" });
            expect(result).toBeAnError("messageId must match pattern MSG\\[A-Za-z0-9\\]\\{17\\}", "error.runtime.validation.invalidPropertyValue");
        });

        test("not existing message id for receivedNotification", async () => {
            const result = await rConsumptionServices.notifications.receivedNotification({ messageId: (await new CoreIdHelper("MSG").generate()).toString() });
            expect(result).toBeAnError("Message not found. Make sure the ID exists and the record is not expired.", "error.runtime.recordNotFound");
        });

        test("processing a Notification using processNotificationById rollbacks all items on error", async () => {
            const notification = await sendAndReceiveNotification(sTransportServices, rTransportServices, rConsumptionServices, [
                TestNotificationItem.from({ identifier: "a", failProcess: false }),
                TestNotificationItem.from({ identifier: "b", failProcess: false }),
                TestNotificationItem.from({ identifier: "c", failProcess: true })
            ]);

            await rConsumptionServices.notifications.processNotificationById({ notificationId: notification.id });

            expect(TestNotificationItemProcessor.processedItems).toHaveLength(2);

            expect(TestNotificationItemProcessor.rollbackedItems).toHaveLength(2);

            expect(TestNotificationItemProcessor.rollbackedItems.map((item) => item.identifier)).toStrictEqual(["b", "a"]);
        });

        test("processing a Notification using processOpenNotifactionsReceivedByCurrentDevice rollbacks all items on error", async () => {
            await sendAndReceiveNotification(sTransportServices, rTransportServices, rConsumptionServices, [
                TestNotificationItem.from({ identifier: "a", failProcess: false }),
                TestNotificationItem.from({ identifier: "b", failProcess: false }),
                TestNotificationItem.from({ identifier: "c", failProcess: true })
            ]);

            await rConsumptionServices.notifications.processOpenNotifactionsReceivedByCurrentDevice();

            expect(TestNotificationItemProcessor.processedItems).toHaveLength(2);

            expect(TestNotificationItemProcessor.rollbackedItems).toHaveLength(2);

            expect(TestNotificationItemProcessor.rollbackedItems.map((item) => item.identifier)).toStrictEqual(["b", "a"]);
        });

        test("should be able to send a Notification", async () => {
            await rTransportServices.relationships.terminateRelationship({ relationshipId });
            const syncedRelationship = (await syncUntilHasRelationships(sTransportServices))[0];
            expect(syncedRelationship.status).toBe(RelationshipStatus.Terminated);

            const id = await ConsumptionIds.notification.generate();
            const notificationToSend = Notification.from({ id, items: [TestNotificationItem.from({})] });

            const result = await sTransportServices.messages.sendMessage({ recipients: [rAddress], content: notificationToSend.toJSON() });
            expect(result).toBeSuccessful();

            const notificationSent = await sConsumptionServices.notifications.sentNotification({ messageId: result.value.id });
            expect(notificationSent).toBeSuccessful();

            const response = await rTransportServices.messages.getMessages({});
            expect(response).toBeSuccessful();
            expect(response.value.length !== 1).toBe(true);

            const notification = await rConsumptionServices.notifications.receivedNotification({ messageId: response.value[response.value.length - 1].id });
            expect(notification).toBeSuccessful();
            expect(notification.value.id.toString() !== id.toString()).toBe(true);

            const getNotificationResult1 = await rConsumptionServices.notifications.getNotification({ id: id.toString() });
            expect(getNotificationResult1).toBeAnError(/.*/, "error.transport.recordNotFound");
        });

        test("should be able to send a Notification and the peer should receive the Notification only after the reactiviation of the Relationship", async () => {
            const id = await ConsumptionIds.notification.generate();
            const notificationToSend = Notification.from({ id, items: [TestNotificationItem.from({})] });

            const result = await sTransportServices.messages.sendMessage({ recipients: [rAddress], content: notificationToSend.toJSON() });
            expect(result).toBeSuccessful();

            const notificationSent = await sConsumptionServices.notifications.sentNotification({ messageId: result.value.id });
            expect(notificationSent).toBeSuccessful();

            await rTransportServices.relationships.requestRelationshipReactivation({ relationshipId });
            await syncUntilHasRelationships(sTransportServices);

            const acceptanceResult = await sTransportServices.relationships.acceptRelationshipReactivation({ relationshipId });
            expect(acceptanceResult).toBeSuccessful();
            expect(acceptanceResult.value.status).toBe(RelationshipStatus.Active);

            const relationship1 = (await syncUntilHasRelationships(rTransportServices))[0];
            expect(relationship1.status).toBe(RelationshipStatus.Active);

            await syncUntilHasEvent(sRuntimeServices, RelationshipReactivationCompletedEvent, (e) => e.data.id === relationshipId);
            await rRuntimeServices.eventBus.waitForRunningEventHandlers();

            await syncUntilHasEvent(rRuntimeServices, RelationshipReactivationCompletedEvent, (e) => e.data.id === relationshipId);
            await rRuntimeServices.eventBus.waitForRunningEventHandlers();

            const response = await rTransportServices.messages.getMessages({});
            expect(response).toBeSuccessful();
            expect(response.value.length !== 1).toBe(true);

            const notification = await rConsumptionServices.notifications.receivedNotification({ messageId: response.value[response.value.length - 1].id });
            expect(notification).toBeSuccessful();
            expect(notification.value.id.toString() === id.toString()).toBe(true);

            const getNotificationResult0 = await rConsumptionServices.notifications.getNotification({ id: id.toString() });
            expect(getNotificationResult0).toBeSuccessful();
        });

        test("should be able to send Notifications and the peer should receive the Notifications in the right order after the reactiviation of the Relationship", async () => {
            const ownSharedIdentityAttributeV0 = await executeFullCreateAndShareRepositoryAttributeFlow(rRuntimeServices, sRuntimeServices, {
                content: {
                    value: {
                        "@type": "GivenName",
                        value: "Own name"
                    }
                }
            });

            const createdAttribut = await sConsumptionServices.attributes.getAttribute({ id: ownSharedIdentityAttributeV0.id });
            expect(createdAttribut).toBeDefined();

            await rTransportServices.relationships.terminateRelationship({ relationshipId });
            const syncedRelationship = (await syncUntilHasRelationships(sTransportServices))[0];
            expect(syncedRelationship.status).toBe(RelationshipStatus.Terminated);

            const { successor: ownSharedIdentityAttributeV1 } = (
                await rConsumptionServices.attributes.succeedRepositoryAttribute({
                    predecessorId: ownSharedIdentityAttributeV0.shareInfo!.sourceAttribute!,
                    successorContent: {
                        value: {
                            "@type": "GivenName",
                            value: "New own name"
                        }
                    }
                })
            ).value;

            const result = await rConsumptionServices.attributes.notifyPeerAboutRepositoryAttributeSuccession({
                attributeId: ownSharedIdentityAttributeV1.id,
                peer: sRuntimeServices.address
            });

            await rRuntimeServices.eventBus.waitForEvent(OwnSharedAttributeSucceededEvent, (e) => {
                return e.data.successor.id === result.value.successor.id;
            });

            const notification = await sConsumptionServices.notifications.getNotification({ id: result.value.notificationId });
            expect(notification).toBeAnError(/.*/, "error.transport.recordNotFound");

            const createdAttribute = await sConsumptionServices.attributes.getAttribute({ id: ownSharedIdentityAttributeV0.id });
            expect(createdAttribute.value.succeededBy).toBeUndefined();

            await rConsumptionServices.attributes.deleteOwnSharedAttributeAndNotifyPeer({ attributeId: ownSharedIdentityAttributeV0.id });

            await rTransportServices.relationships.requestRelationshipReactivation({ relationshipId });
            await syncUntilHasRelationships(sTransportServices);

            const acceptanceResult = await sTransportServices.relationships.acceptRelationshipReactivation({ relationshipId });
            expect(acceptanceResult).toBeSuccessful();
            expect(acceptanceResult.value.status).toBe(RelationshipStatus.Active);

            const relationship1 = (await syncUntilHasRelationships(rTransportServices))[0];
            expect(relationship1.status).toBe(RelationshipStatus.Active);

            const messages = await syncUntilHasMessages(sTransportServices);
            expect(messages.length === 2).toBe(true);

            const notification0 = await sConsumptionServices.notifications.receivedNotification({ messageId: messages[0].id });
            expect(notification0).toBeSuccessful();

            const notification1 = await sConsumptionServices.notifications.receivedNotification({ messageId: messages[1].id });
            expect(notification1).toBeSuccessful();

            await sConsumptionServices.notifications.processNotificationById({ notificationId: notification0.value.id });

            const createdAttribute0 = await sConsumptionServices.attributes.getAttribute({ id: ownSharedIdentityAttributeV0.id });
            expect(createdAttribute0.value.succeededBy).toBeDefined();
            expect(createdAttribute0.value.deletionInfo).toBeUndefined();

            await sConsumptionServices.notifications.processNotificationById({ notificationId: notification1.value.id });

            const createdAttribute1 = await sConsumptionServices.attributes.getAttribute({ id: ownSharedIdentityAttributeV0.id });
            expect(createdAttribute1.value.succeededBy).toBeDefined();
            expect(createdAttribute1.value.deletionInfo).toBeDefined();

            const successor = await sConsumptionServices.attributes.getAttribute({ id: createdAttribute1.value.succeededBy! });
            expect(successor).toBeDefined();

            expect(CoreDate.from(acceptanceResult.value.auditLog[acceptanceResult.value.auditLog.length - 1].createdAt).isBefore(CoreDate.from(successor.value.createdAt))).toBe(
                true
            );

            expect(CoreDate.from(successor.value.createdAt).isBefore(CoreDate.from(createdAttribute1.value.deletionInfo!.deletionDate))).toBe(true);
        });
    });
});
