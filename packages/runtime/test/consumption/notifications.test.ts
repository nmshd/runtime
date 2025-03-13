import { ConsumptionIds } from "@nmshd/consumption";
import { Notification } from "@nmshd/content";
import { CoreId, CoreIdHelper } from "@nmshd/core-types";
import { ConsumptionServices, LocalNotificationStatus, RuntimeErrors, TransportServices } from "../../src";
import {
    establishRelationship,
    RuntimeServiceProvider,
    sendAndReceiveNotification,
    syncUntilHasMessageWithNotification,
    TestNotificationItem,
    TestNotificationItemProcessor
} from "../lib";

const runtimeServiceProvider = new RuntimeServiceProvider();
let sTransportServices: TransportServices;
let sConsumptionServices: ConsumptionServices;

let rTransportServices: TransportServices;
let rConsumptionServices: ConsumptionServices;
let rAddress: string;

beforeAll(async () => {
    const runtimeServices = await runtimeServiceProvider.launch(2);
    sTransportServices = runtimeServices[1].transport;
    sConsumptionServices = runtimeServices[1].consumption;

    rTransportServices = runtimeServices[0].transport;
    rConsumptionServices = runtimeServices[0].consumption;
    rAddress = (await rTransportServices.account.getIdentityInfo()).value.address;

    await establishRelationship(sTransportServices, rTransportServices);
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
    });
});
