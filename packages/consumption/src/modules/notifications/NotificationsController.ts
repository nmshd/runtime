import { Event, EventBus } from "@js-soft/ts-utils";
import { Notification, NotificationItem } from "@nmshd/content";
import { CoreAddress, CoreId } from "@nmshd/core-types";
import { Message, SynchronizedCollection, TransportCoreErrors } from "@nmshd/transport";
import { ConsumptionBaseController } from "../../consumption/ConsumptionBaseController";
import { ConsumptionController } from "../../consumption/ConsumptionController";
import { ConsumptionControllerName } from "../../consumption/ConsumptionControllerName";
import { NotificationItemProcessorRegistry } from "./itemProcessors/NotificationItemProcessorRegistry";
import { LocalNotification, LocalNotificationStatus } from "./local/LocalNotification";
import { LocalNotificationSource } from "./local/LocalNotificationSource";

export class NotificationsController extends ConsumptionBaseController {
    public constructor(
        private readonly localNotifications: SynchronizedCollection,
        private readonly processorRegistry: NotificationItemProcessorRegistry,
        parent: ConsumptionController,
        private readonly eventBus: EventBus,
        private readonly device: { id: CoreId }
    ) {
        super(ConsumptionControllerName.NotificationsController, parent);
    }

    public async getNotifications(query?: any): Promise<LocalNotification[]> {
        const notifications = await this.localNotifications.find(query);
        return notifications.map((notification) => LocalNotification.from(notification));
    }

    public async getNotification(id: CoreId): Promise<LocalNotification> {
        const notification = await this.localNotifications.findOne({ id: id.toString() });
        if (!notification) {
            throw TransportCoreErrors.general.recordNotFound(LocalNotification, id.toString());
        }

        return LocalNotification.from(notification);
    }

    public async sent(message: Message): Promise<LocalNotification> {
        if (!message.isOwn) throw new Error("Cannot mark a LocalNotification as sent from a received Message.");

        const content = this.extractNotificationFromMessage(message);

        const recipients = message.recipients;
        if (recipients.length > 1) throw new Error("Message contains more than one recipient.");

        const notification = LocalNotification.from({
            id: content.id,
            content,
            status: LocalNotificationStatus.Sent,
            isOwn: true,
            createdAt: message.createdAt,
            peer: recipients[0].address,
            source: LocalNotificationSource.message(message.id)
        });

        await this.localNotifications.create(notification);
        return notification;
    }

    public async received(message: Message): Promise<LocalNotification> {
        if (message.isOwn) throw new Error("Cannot receive a Notification from an own message.");

        const content = this.extractNotificationFromMessage(message);

        const notification = LocalNotification.from({
            id: content.id,
            content,
            status: LocalNotificationStatus.Open,
            isOwn: false,
            createdAt: message.createdAt,
            peer: message.createdBy,
            source: LocalNotificationSource.message(message.id),
            receivedByDevice: this.device.id
        });

        await this.localNotifications.create(notification);

        return notification;
    }

    private extractNotificationFromMessage(message: Message): Notification {
        if (!(message.content instanceof Notification)) {
            throw new Error("Message does not contain a Notification.");
        }

        return message.content;
    }

    public async processOpenNotifactionsReceivedByCurrentDevice(): Promise<void> {
        const notifications = await this.localNotifications.find({
            receivedByDevice: this.device.id.toString(),
            isOwn: false,
            status: LocalNotificationStatus.Open
        });

        for (const notificationDoc of notifications) {
            const notification = LocalNotification.from(notificationDoc);
            await this.process(notificationDoc, notification);
        }
    }

    public async processNotificationById(notificationId: CoreId): Promise<LocalNotification> {
        const notificationDoc = await this.localNotifications.findOne({ id: notificationId.toString() });
        if (!notificationDoc) {
            throw TransportCoreErrors.general.recordNotFound(LocalNotification, notificationId.toString());
        }

        const parsed = LocalNotification.from(notificationDoc);
        return await this.process(notificationDoc, parsed);
    }

    private async process(oldDoc: any, notification: LocalNotification): Promise<LocalNotification> {
        if (notification.isOwn) throw new Error("Cannot process own notification.");

        if (!notification.receivedByDevice?.equals(this.device.id)) {
            throw new Error("Notification is not received by current device.");
        }

        if (![LocalNotificationStatus.Open, LocalNotificationStatus.Error].includes(notification.status)) {
            throw new Error(`Cannot process notification with status ${notification.status}.`);
        }

        const processedItems: NotificationItem[] = [];
        const events: Event[] = [];

        try {
            for (const item of notification.content.items) {
                const processor = this.processorRegistry.getProcessorForItem(item);

                const checkResult = await processor.checkPrerequisitesOfIncomingNotificationItem(item, notification);
                if (checkResult.isError()) {
                    const index = notification.content.items.indexOf(item);
                    throw new Error(`Prerequisites of notificationItem with index '${index}' of Notification ${notification.id} not met. Root cause: ${checkResult.error}`);
                }

                const event = await processor.process(item, notification);
                processedItems.push(item);
                if (event) events.push(event);
            }
        } catch (e) {
            this._log.error(`Error while processing notification ${notification.id}: ${e}`);

            for (const item of processedItems.reverse()) {
                const processor = this.processorRegistry.getProcessorForItem(item);
                await processor.rollback(item, notification);
            }

            notification.status = LocalNotificationStatus.Error;
            await this.localNotifications.update(oldDoc, notification);

            return notification;
        }

        notification.status = LocalNotificationStatus.Completed;
        await this.localNotifications.update(oldDoc, notification);

        for (const event of events) this.eventBus.publish(event);

        return notification;
    }

    public async deleteNotificationsExchangedWithPeer(peer: CoreAddress): Promise<void> {
        const notifications = await this.getNotifications({ peer: peer.toString() });
        for (const notification of notifications) {
            await this.localNotifications.delete(notification);
        }
    }
}
