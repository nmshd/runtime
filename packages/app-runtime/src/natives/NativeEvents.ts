import { NativeEvent } from "./NativeEvent";

export class RemoteNotificationRegistrationEvent extends NativeEvent {
    public static namespace = "RemoteNotificationRegistration";
    public constructor(public readonly token: string) {
        super(RemoteNotificationRegistrationEvent.namespace);
    }
}

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

export class UrlOpenEvent extends NativeEvent {
    public static namespace = "UrlOpenEvent";
    public constructor(public readonly url: string) {
        super(UrlOpenEvent.namespace);
    }
}

export class AppReadyEvent extends NativeEvent {
    public static namespace = "AppReadyEvent";
    public constructor() {
        super(AppReadyEvent.namespace);
    }
}
