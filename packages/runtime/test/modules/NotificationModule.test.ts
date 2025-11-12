import { ConsumptionIds } from "@nmshd/consumption";
import { Notification } from "@nmshd/content";
import { ConsumptionServices, LocalNotificationStatus, TransportServices } from "@nmshd/runtime";
import {
    establishRelationship,
    MockEventBus,
    RuntimeServiceProvider,
    syncUntilHasMessageWithNotification,
    TestNotificationItem,
    TestNotificationItemProcessor
} from "../lib/index.js";

const runtimeServiceProvider = new RuntimeServiceProvider();
let sTransportServices: TransportServices;
let sConsumptionServices: ConsumptionServices;
let sEventBus: MockEventBus;

let rTransportServices: TransportServices;
let rConsumptionServices: ConsumptionServices;
let rEventBus: MockEventBus;
let rAddress: string;

beforeAll(async () => {
    const runtimeServices = await runtimeServiceProvider.launch(2, { enableNotificationModule: true });
    sTransportServices = runtimeServices[1].transport;
    sConsumptionServices = runtimeServices[1].consumption;
    sEventBus = runtimeServices[1].eventBus;

    rTransportServices = runtimeServices[0].transport;
    rConsumptionServices = runtimeServices[0].consumption;
    rEventBus = runtimeServices[0].eventBus;
    rAddress = (await rTransportServices.account.getIdentityInfo()).value.address;

    await establishRelationship(sTransportServices, rTransportServices);
}, 30000);

beforeEach(() => {
    sEventBus.reset();
    rEventBus.reset();

    TestNotificationItemProcessor.reset();
});

afterAll(async () => await runtimeServiceProvider.stop());

describe("NotificationModule", () => {
    test("runs sent when sending a Message containing a Notification", async () => {
        const notificationId = await ConsumptionIds.notification.generate();
        await sTransportServices.messages.sendMessage({
            recipients: [rAddress],
            content: Notification.from({ id: notificationId, items: [TestNotificationItem.from({})] }).toJSON()
        });
        await sEventBus.waitForRunningEventHandlers();

        const getNotificationResult = await sConsumptionServices.notifications.getNotification({ id: notificationId.toString() });
        expect(getNotificationResult).toBeSuccessful();
    });

    test("runs received and process when receiving a Message containing a Notification", async () => {
        const notificationId = await ConsumptionIds.notification.generate();
        await sTransportServices.messages.sendMessage({
            recipients: [rAddress],
            content: Notification.from({ id: notificationId, items: [TestNotificationItem.from({})] }).toJSON()
        });
        await syncUntilHasMessageWithNotification(rTransportServices, notificationId);
        await rEventBus.waitForRunningEventHandlers();

        const getNotificationResult = await rConsumptionServices.notifications.getNotification({ id: notificationId.toString() });
        expect(getNotificationResult).toBeSuccessful();

        const notification = getNotificationResult.value;
        expect(notification.status).toStrictEqual(LocalNotificationStatus.Completed);
    });
});
