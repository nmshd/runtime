import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreId, ICoreId } from "@nmshd/core-types";
import { INotificationItem, NotificationItem, NotificationItemJSON } from "../NotificationItem";

export interface PeerSharedAttributeDeletedByPeerNotificationItemJSON extends NotificationItemJSON {
    "@type": "PeerSharedAttributeDeletedByPeerNotificationItem";
    attributeId: string;
}

export interface IPeerSharedAttributeDeletedByPeerNotificationItem extends INotificationItem {
    attributeId: ICoreId;
}

@type("PeerSharedAttributeDeletedByPeerNotificationItem")
export class PeerSharedAttributeDeletedByPeerNotificationItem extends NotificationItem implements IPeerSharedAttributeDeletedByPeerNotificationItem {
    @validate()
    @serialize()
    public attributeId: CoreId;

    public static from(
        value: IPeerSharedAttributeDeletedByPeerNotificationItem | Omit<PeerSharedAttributeDeletedByPeerNotificationItemJSON, "@type">
    ): PeerSharedAttributeDeletedByPeerNotificationItem {
        return this.fromAny(value);
    }
}
