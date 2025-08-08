import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreId, ICoreId } from "@nmshd/core-types";
import { INotificationItem, NotificationItem, NotificationItemJSON } from "../NotificationItem";

export interface ForwardedAttributeDeletedNotificationItemJSON extends NotificationItemJSON {
    "@type": "ForwardedAttributeDeletedNotificationItem";
    attributeId: string;
}

export interface IForwardedAttributeDeletedNotificationItem extends INotificationItem {
    attributeId: ICoreId;
}

@type("ForwardedAttributeDeletedNotificationItem")
export class ForwardedAttributeDeletedNotificationItem extends NotificationItem implements IForwardedAttributeDeletedNotificationItem {
    @validate()
    @serialize()
    public attributeId: CoreId;

    public static from(
        value: IForwardedAttributeDeletedNotificationItem | Omit<ForwardedAttributeDeletedNotificationItemJSON, "@type">
    ): ForwardedAttributeDeletedNotificationItem {
        return this.fromAny(value);
    }
}
