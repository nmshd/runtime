import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreId, ICoreId } from "@nmshd/core-types";
import { INotificationItem, NotificationItem, NotificationItemJSON } from "../NotificationItem";

export interface PeerRelationshipAttributeDeletedNotificationItemJSON extends NotificationItemJSON {
    "@type": "PeerRelationshipAttributeDeletedNotificationItem";
    attributeId: string;
}

export interface IPeerRelationshipAttributeDeletedNotificationItem extends INotificationItem {
    attributeId: ICoreId;
}

@type("PeerRelationshipAttributeDeletedNotificationItem")
export class PeerRelationshipAttributeDeletedNotificationItem extends NotificationItem implements IPeerRelationshipAttributeDeletedNotificationItem {
    @validate()
    @serialize()
    public attributeId: CoreId;

    public static from(
        value: IPeerRelationshipAttributeDeletedNotificationItem | Omit<PeerRelationshipAttributeDeletedNotificationItemJSON, "@type">
    ): PeerRelationshipAttributeDeletedNotificationItem {
        return this.fromAny(value);
    }
}
