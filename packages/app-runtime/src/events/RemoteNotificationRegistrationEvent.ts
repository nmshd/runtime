import { Event } from "@js-soft/ts-utils";

export class RemoteNotificationRegistrationEvent extends Event {
    public static namespace = "RemoteNotificationRegistration";
    public constructor(public readonly token: string) {
        super(RemoteNotificationRegistrationEvent.namespace);
    }
}
