import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { ConsumptionController, ConsumptionIds, LocalNotification, LocalNotificationSource, LocalNotificationStatus } from "@nmshd/consumption";
import { Notification } from "@nmshd/content";
import { CoreAddress, CoreDate, CoreId } from "@nmshd/core-types";
import { AccountController, Message, SynchronizedCollection, Transport } from "@nmshd/transport";
import { TestUtil } from "../../core/TestUtil.js";
import { TestNotificationItem, TestNotificationItemProcessor } from "./testHelpers/TestNotificationItem.js";

describe("End2End Notification via Messages", function () {
    let connection: IDatabaseConnection;
    let transport: Transport;

    let sAccountController: AccountController;
    let sConsumptionController: ConsumptionController;
    let rAccountController: AccountController;
    let rConsumptionController: ConsumptionController;

    let sMessageWithNotification: Message;
    let rMessageWithNotification: Message;
    let rLocalNotification: LocalNotification;

    let rNotificationsCollection: SynchronizedCollection;
    let sNotificationsCollection: SynchronizedCollection;

    let sLocalNotification: LocalNotification;

    beforeAll(async function () {
        connection = await TestUtil.createConnection();
        transport = TestUtil.createTransport();
        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, connection, 2);

        ({ accountController: sAccountController, consumptionController: sConsumptionController } = accounts[0]);
        sConsumptionController.notifications["processorRegistry"].registerProcessor(TestNotificationItem, TestNotificationItemProcessor);
        ({ accountController: rAccountController, consumptionController: rConsumptionController } = accounts[1]);
        rConsumptionController.notifications["processorRegistry"].registerProcessor(TestNotificationItem, TestNotificationItemProcessor);
        rNotificationsCollection = await rConsumptionController.accountController.getSynchronizedCollection("Notifications");
        sNotificationsCollection = await sConsumptionController.accountController.getSynchronizedCollection("Notifications");

        await TestUtil.addRelationship(sAccountController, rAccountController);

        const id = await ConsumptionIds.notification.generate();
        const localNotification = LocalNotification.from({
            id,
            content: Notification.from({ id, items: [TestNotificationItem.from({})] }),
            isOwn: true,
            peer: CoreAddress.from("anAddress"),
            createdAt: CoreDate.utc(),
            status: LocalNotificationStatus.Open,
            source: LocalNotificationSource.message(CoreId.from("anId"))
        });

        sLocalNotification = localNotification;

        sMessageWithNotification = await sAccountController.messages.sendMessage({
            content: localNotification.content,
            recipients: [rAccountController.identity.address]
        });
    });

    afterAll(async function () {
        await connection.close();
    });

    beforeEach(function () {
        TestNotificationItemProcessor.reset();
    });

    test("sender: mark LocalNotification as sent", async function () {
        const localNotification = await sConsumptionController.notifications.sent(sMessageWithNotification);
        expect(localNotification.status).toStrictEqual(LocalNotificationStatus.Sent);
        expect(localNotification.content.items[0]).toBeInstanceOf(TestNotificationItem);

        const persistedLocalNotification = await sNotificationsCollection.findOne({
            id: localNotification.id.toString()
        });
        expect(persistedLocalNotification).toBeDefined();
        expect(persistedLocalNotification.status).toStrictEqual(LocalNotificationStatus.Sent);
    });

    test("recipient: syncEverything to get Message with Notification", async function () {
        const messages = await TestUtil.syncUntilHasMessages(rAccountController);
        rMessageWithNotification = messages[0];
        expect(rMessageWithNotification.content).toBeInstanceOf(Notification);
    });

    test("recipient: received Notification", async function () {
        rLocalNotification = await rConsumptionController.notifications.received(rMessageWithNotification);
        expect(rLocalNotification.status).toStrictEqual(LocalNotificationStatus.Open);
        expect(rLocalNotification.id.toString()).toStrictEqual(sLocalNotification.id.toString());
        expect(rLocalNotification.content.items[0]).toBeInstanceOf(TestNotificationItem);

        const rLocalNotificationDB = await rNotificationsCollection.findOne({
            id: rLocalNotification.id.toString()
        });
        expect(rLocalNotificationDB).toBeDefined();
        expect(rLocalNotificationDB.status).toStrictEqual(LocalNotificationStatus.Open);

        expect(TestNotificationItemProcessor.processedItems).toHaveLength(0);
    });

    test("recipient: process Notification", async function () {
        const processedNotifiocation = await rConsumptionController.notifications.processNotificationById(rLocalNotification.id);

        expect(processedNotifiocation.status).toStrictEqual(LocalNotificationStatus.Completed);

        const rLocalNotificationDB = await rNotificationsCollection.findOne({
            id: rLocalNotification.id.toString()
        });
        expect(rLocalNotificationDB).toBeDefined();
        expect(rLocalNotificationDB.status).toStrictEqual(LocalNotificationStatus.Completed);

        expect(TestNotificationItemProcessor.processedItems).toHaveLength(1);
    });

    test("recipient: processes open notifactions received by current device", async function () {
        const id = await ConsumptionIds.notification.generate();
        await rNotificationsCollection.create(
            LocalNotification.from({
                id,
                content: Notification.from({ id, items: [TestNotificationItem.from({})] }),
                isOwn: false,
                peer: CoreAddress.from("anAddress"),
                createdAt: CoreDate.utc(),
                status: LocalNotificationStatus.Open,
                source: LocalNotificationSource.message(CoreId.from("anId")),
                receivedByDevice: rAccountController.activeDevice.id
            })
        );

        await rConsumptionController.notifications.processOpenNotifactionsReceivedByCurrentDevice();
        expect(TestNotificationItemProcessor.processedItems).toHaveLength(1);
    });

    test("recipient: processes no notifactions received by other device", async function () {
        const id = await ConsumptionIds.notification.generate();
        await rNotificationsCollection.create(
            LocalNotification.from({
                id,
                content: Notification.from({ id, items: [TestNotificationItem.from({})] }),
                isOwn: false,
                peer: CoreAddress.from("anAddress"),
                createdAt: CoreDate.utc(),
                status: LocalNotificationStatus.Open,
                source: LocalNotificationSource.message(CoreId.from("anId")),
                receivedByDevice: CoreId.from("anotherDevice")
            })
        );

        await rConsumptionController.notifications.processOpenNotifactionsReceivedByCurrentDevice();
        expect(TestNotificationItemProcessor.processedItems).toHaveLength(0);
    });

    test("recipient: delete notification while decomposing relationship", async function () {
        await TestUtil.terminateRelationship(rAccountController, sAccountController);
        await TestUtil.decomposeRelationship(rAccountController, rConsumptionController, sAccountController);

        const notification = await rNotificationsCollection.findOne({
            id: rLocalNotification.id.toString()
        });
        expect(notification).toBeFalsy();
    });
});
