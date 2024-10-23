import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreId, ICoreId } from "@nmshd/core-types";
import { INotificationItem, NotificationItem, NotificationItemJSON } from "../NotificationItem";

export interface ThirdPartyRelationshipAttributeDeletedByPeerNotificationItemJSON extends NotificationItemJSON {
    "@type": "ThirdPartyRelationshipAttributeDeletedByPeerNotificationItem";
    attributeId: string;
}

export interface IThirdPartyRelationshipAttributeDeletedByPeerNotificationItem extends INotificationItem {
    attributeId: ICoreId;
}

// The ThirdPartyOwnedRelationshipAttributeDeletedByPeerNotificationItem is deprecated and will be removed in the next major version.
@type("ThirdPartyOwnedRelationshipAttributeDeletedByPeerNotificationItem")
@type("ThirdPartyRelationshipAttributeDeletedByPeerNotificationItem")
export class ThirdPartyRelationshipAttributeDeletedByPeerNotificationItem extends NotificationItem implements IThirdPartyRelationshipAttributeDeletedByPeerNotificationItem {
    @validate()
    @serialize()
    public attributeId: CoreId;

    public static from(
        value: IThirdPartyRelationshipAttributeDeletedByPeerNotificationItem | Omit<ThirdPartyRelationshipAttributeDeletedByPeerNotificationItemJSON, "@type">
    ): ThirdPartyRelationshipAttributeDeletedByPeerNotificationItem {
        return this.fromAny(value);
    }
}
