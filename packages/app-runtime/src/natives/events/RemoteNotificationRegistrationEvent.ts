import { NativeEvent } from "../NativeEvent";

export class RemoteNotificationRegistrationEvent extends NativeEvent {
    public static namespace = "RemoteNotificationRegistration";
    public constructor(public readonly token: string) {
        super(RemoteNotificationRegistrationEvent.namespace);
    }
}
