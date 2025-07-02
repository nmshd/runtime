import { NotificationJSON } from "@nmshd/content";

export enum LocalNotificationStatus {
    Open = "Open",
    Sent = "Sent",
    Completed = "Completed",
    Error = "Error"
}

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
