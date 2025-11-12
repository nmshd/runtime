import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { ConsumptionController, ConsumptionIds, LocalNotification, LocalNotificationSource, LocalNotificationStatus } from "@nmshd/consumption";
import { Notification } from "@nmshd/content";
import { CoreAddress, CoreDate, CoreId } from "@nmshd/core-types";
import { AccountController, SynchronizedCollection, Transport } from "@nmshd/transport";
import { TestUtil } from "../../core/TestUtil.js";
import { TestNotificationItem, TestNotificationItemProcessor } from "./testHelpers/TestNotificationItem.js";

describe("End2End Notification via Messages", function () {
    let connection: IDatabaseConnection;
    let transport: Transport;

    let sAccountController: AccountController;
    let sConsumptionController: ConsumptionController;
    let rAccountController: AccountController;
    let rConsumptionController: ConsumptionController;
    let localNotification: LocalNotification;

    let rNotificationsCollection: SynchronizedCollection;

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

        await TestUtil.addRelationship(sAccountController, rAccountController);

        const id = await ConsumptionIds.notification.generate();
        localNotification = LocalNotification.from({
            id,
            content: Notification.from({ id, items: [TestNotificationItem.from({})] }),
            isOwn: true,
            peer: CoreAddress.from("anAddress"),
            createdAt: CoreDate.utc(),
            status: LocalNotificationStatus.Open,
            source: LocalNotificationSource.message(CoreId.from("anId"))
        });

        await sAccountController.messages.sendMessage({
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

    test("recipient: delete notification while decomposing relationship", async function () {
        await rConsumptionController.notifications.deleteNotificationsExchangedWithPeer(sAccountController.identity.address);

        const notification = await rNotificationsCollection.findOne({
            id: localNotification.id.toString()
        });
        expect(notification).toBeFalsy();
    });
});
