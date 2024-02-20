import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreId, ICoreId } from "@nmshd/transport";
import { INotificationItem, NotificationItem, NotificationItemJSON } from "../NotificationItem";

export interface AttributeDeletedNotificationItemJSON extends NotificationItemJSON {
    "@type": "AttributeDeletedNotificationItem";
    attributeId: string;
}

export interface IAttributeDeletedNotificationItem extends INotificationItem {
    attributeId: ICoreId;
}

@type("AttributeDeletedNotificationItem")
export class AttributeDeletedNotificationItem extends NotificationItem implements IAttributeDeletedNotificationItem {
    @validate()
    @serialize()
    public attributeId: CoreId;

    public static from(value: IAttributeDeletedNotificationItem): AttributeDeletedNotificationItem {
        return this.fromAny(value);
    }
}
