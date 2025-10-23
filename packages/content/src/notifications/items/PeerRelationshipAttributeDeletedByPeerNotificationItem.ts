import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreId, ICoreId } from "@nmshd/core-types";
import { INotificationItem, NotificationItem, NotificationItemJSON } from "../NotificationItem";

export interface PeerRelationshipAttributeDeletedByPeerNotificationItemJSON extends NotificationItemJSON {
    "@type": "PeerRelationshipAttributeDeletedByPeerNotificationItem";
    attributeId: string;
}

export interface IPeerRelationshipAttributeDeletedByPeerNotificationItem extends INotificationItem {
    attributeId: ICoreId;
}

@type("PeerRelationshipAttributeDeletedByPeerNotificationItem")
export class PeerRelationshipAttributeDeletedByPeerNotificationItem extends NotificationItem implements IPeerRelationshipAttributeDeletedByPeerNotificationItem {
    @validate()
    @serialize()
    public attributeId: CoreId;

    public static from(
        value: IPeerRelationshipAttributeDeletedByPeerNotificationItem | Omit<PeerRelationshipAttributeDeletedByPeerNotificationItemJSON, "@type">
    ): PeerRelationshipAttributeDeletedByPeerNotificationItem {
        return this.fromAny(value);
    }
}
