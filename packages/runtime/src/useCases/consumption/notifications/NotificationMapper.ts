import { LocalNotification } from "@nmshd/consumption";
import { NotificationJSON } from "@nmshd/content";
import { LocalNotificationDTO } from "../../../types";

export class NotificationMapper {
    public static toNotificationDTO(notification: LocalNotification): LocalNotificationDTO {
        return {
            id: notification.id.toString(),
            isOwn: notification.isOwn,
            peer: notification.peer.toString(),
            createdAt: notification.createdAt.toISOString(),
            receivedByDevice: notification.receivedByDevice?.toString(),
            content: notification.content.toJSON() as NotificationJSON,
            status: notification.status,
            source: {
                type: "Message",
                reference: notification.source.reference.toString()
            }
        };
    }

    public static toNotificationDTOList(notifications: LocalNotification[]): any {
        return notifications.map((notification) => this.toNotificationDTO(notification));
    }
}
