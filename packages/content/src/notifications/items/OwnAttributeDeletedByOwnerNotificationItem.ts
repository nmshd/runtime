import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreId, ICoreId } from "@nmshd/core-types";
import { INotificationItem, NotificationItem, NotificationItemJSON } from "../NotificationItem.js";

export interface OwnAttributeDeletedByOwnerNotificationItemJSON extends NotificationItemJSON {
    "@type": "OwnAttributeDeletedByOwnerNotificationItem";
    attributeId: string;
}

export interface IOwnAttributeDeletedByOwnerNotificationItem extends INotificationItem {
    attributeId: ICoreId;
}

@type("OwnAttributeDeletedByOwnerNotificationItem")
export class OwnAttributeDeletedByOwnerNotificationItem extends NotificationItem implements IOwnAttributeDeletedByOwnerNotificationItem {
    @validate()
    @serialize()
    public attributeId: CoreId;

    public static from(
        value: IOwnAttributeDeletedByOwnerNotificationItem | Omit<OwnAttributeDeletedByOwnerNotificationItemJSON, "@type">
    ): OwnAttributeDeletedByOwnerNotificationItem {
        return this.fromAny(value);
    }
}
