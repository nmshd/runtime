import { NativeEvent } from "../NativeEvent";

export interface RemoteNotification {
    content: any;
    id?: string;
    foreground?: boolean;
    limitedProcessingTime?: string;
}

export class RemoteNotificationEvent extends NativeEvent {
    public static namespace = "RemoteNotification";
    public constructor(public readonly notification: RemoteNotification) {
        super(RemoteNotificationEvent.namespace);
    }
}
