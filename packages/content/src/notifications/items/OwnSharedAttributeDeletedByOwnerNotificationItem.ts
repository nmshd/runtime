import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreId, ICoreId } from "@nmshd/core-types";
import { INotificationItem, NotificationItem, NotificationItemJSON } from "../NotificationItem";

export interface OwnSharedAttributeDeletedByOwnerNotificationItemJSON extends NotificationItemJSON {
    "@type": "OwnSharedAttributeDeletedByOwnerNotificationItem";
    attributeId: string;
}

export interface IOwnSharedAttributeDeletedByOwnerNotificationItem extends INotificationItem {
    attributeId: ICoreId;
}

@type("OwnSharedAttributeDeletedByOwnerNotificationItem")
export class OwnSharedAttributeDeletedByOwnerNotificationItem extends NotificationItem implements IOwnSharedAttributeDeletedByOwnerNotificationItem {
    @validate()
    @serialize()
    public attributeId: CoreId;

    public static from(
        value: IOwnSharedAttributeDeletedByOwnerNotificationItem | Omit<OwnSharedAttributeDeletedByOwnerNotificationItemJSON, "@type">
    ): OwnSharedAttributeDeletedByOwnerNotificationItem {
        return this.fromAny(value);
    }
}
