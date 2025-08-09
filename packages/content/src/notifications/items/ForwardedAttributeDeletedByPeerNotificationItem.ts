import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreId, ICoreId } from "@nmshd/core-types";
import { INotificationItem, NotificationItem, NotificationItemJSON } from "../NotificationItem";

export interface ForwardedAttributeDeletedByPeerNotificationItemJSON extends NotificationItemJSON {
    "@type": "ForwardedAttributeDeletedByPeerNotificationItem";
    attributeId: string;
}

export interface IForwardedAttributeDeletedByPeerNotificationItem extends INotificationItem {
    attributeId: ICoreId;
}

@type("ForwardedAttributeDeletedByPeerNotificationItem")
export class ForwardedAttributeDeletedByPeerNotificationItem extends NotificationItem implements IForwardedAttributeDeletedByPeerNotificationItem {
    @validate()
    @serialize()
    public attributeId: CoreId;

    public static from(
        value: IForwardedAttributeDeletedByPeerNotificationItem | Omit<ForwardedAttributeDeletedByPeerNotificationItemJSON, "@type">
    ): ForwardedAttributeDeletedByPeerNotificationItem {
        return this.fromAny(value);
    }
}
