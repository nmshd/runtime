import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreId, ICoreId } from "@nmshd/core-types";
import { INotificationItem, NotificationItem, NotificationItemJSON } from "./NotificationItem.js";

export interface NotificationJSON {
    "@type": "Notification";

    id: string;

    /**
     * The items of the Notification.
     */
    items: NotificationItemJSON[];
}

export interface INotification extends ISerializable {
    id: ICoreId;

    /**
     * The items of the Notification.
     */
    items: INotificationItem[];
}

@type("Notification")
export class Notification extends Serializable implements INotification {
    @serialize()
    @validate()
    public id: CoreId;

    @serialize({ type: NotificationItem })
    @validate({ customValidator: (v) => (v.length < 1 ? "may not be empty" : undefined) })
    public items: NotificationItem[];

    public static from(value: INotification): Notification {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): NotificationJSON {
        return super.toJSON(verbose, serializeAsString) as NotificationJSON;
    }
}
