import { MessageReceivedEvent, MessageSentEvent } from "../events";
import { RuntimeModule } from "../extensibility/modules/RuntimeModule";

export class NotificationModule extends RuntimeModule {
    public init(): void {
        // Noting to do here
    }

    public start(): void {
        this.subscribeToEvent(MessageReceivedEvent, this.handleMessageReceivedEvent.bind(this));
        this.subscribeToEvent(MessageSentEvent, this.handleMessageSentEvent.bind(this));
    }

    private async handleMessageReceivedEvent(event: MessageReceivedEvent) {
        const message = event.data;
        if (message.content["@type"] !== "Notification") return;

        const services = await this.runtime.getServices(event.eventTargetAddress);

        const receivedResult = await services.consumptionServices.notifications.receivedNotification({ messageId: message.id });
        if (receivedResult.isError) {
            this.logger.error(`Could not mark Notification as received for message '${message.id}'.`, receivedResult.error);
            return;
        }

        const notification = receivedResult.value;
        const processResult = await services.consumptionServices.notifications.processNotificationById({ notificationId: notification.id });
        if (processResult.isError) {
            this.logger.error(`Could not process Notification '${notification.id}'.`, processResult.error);
            return;
        }
    }

    private async handleMessageSentEvent(event: MessageSentEvent) {
        const message = event.data;
        if (message.content["@type"] !== "Notification") return;

        const services = await this.runtime.getServices(event.eventTargetAddress);

        const sentResult = await services.consumptionServices.notifications.sentNotification({ messageId: message.id });
        if (sentResult.isError) {
            this.logger.error(`Could not mark Notification as sent by Message '${message.id}'.`, sentResult.error);
            return;
        }
    }

    public stop(): void {
        this.unsubscribeFromAllEvents();
    }
}
