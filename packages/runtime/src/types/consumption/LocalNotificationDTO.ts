import { LocalNotificationStatus } from "@nmshd/consumption";
import { NotificationJSON } from "@nmshd/content";

export interface LocalNotificationDTO {
    id: string;
    isOwn: boolean;
    peer: string;
    createdAt: string;
    receivedByDevice?: string;
    content: NotificationJSON;
    status: LocalNotificationStatus;
    source: {
        type: "Message";
        reference: string;
    };
}
