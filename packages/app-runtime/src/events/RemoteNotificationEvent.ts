import { Event } from "@js-soft/ts-utils";

export interface RemoteNotification {
    content: any;
    id?: string;
    foreground?: boolean;
    limitedProcessingTime?: string;
}

export class RemoteNotificationEvent extends Event {
    public static namespace = "RemoteNotification";
    public constructor(public readonly notification: RemoteNotification) {
        super(RemoteNotificationEvent.namespace);
    }
}
