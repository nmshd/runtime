// This file is deprecated and will be removed in the next major version. Use ThirdPartyRelationshipAttributeDeletedByPeerNotificationItem instead.
import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreId, ICoreId } from "@nmshd/core-types";
import { INotificationItem, NotificationItem, NotificationItemJSON } from "../NotificationItem";

/**
 * @deprecated Use ThirdPartyRelationshipAttributeDeletedByPeerNotificationItemJSON instead.
 */
export interface ThirdPartyOwnedRelationshipAttributeDeletedByPeerNotificationItemJSON extends NotificationItemJSON {
    "@type": "ThirdPartyOwnedRelationshipAttributeDeletedByPeerNotificationItem";
    attributeId: string;
}

/**
 * @deprecated Use IThirdPartyRelationshipAttributeDeletedByPeerNotificationItem instead.
 */
export interface IThirdPartyOwnedRelationshipAttributeDeletedByPeerNotificationItem extends INotificationItem {
    attributeId: ICoreId;
}

/**
 * @deprecated Use ThirdPartyRelationshipAttributeDeletedByPeerNotificationItem instead.
 */
@type("ThirdPartyOwnedRelationshipAttributeDeletedByPeerNotificationItem")
export class ThirdPartyOwnedRelationshipAttributeDeletedByPeerNotificationItem
    extends NotificationItem
    implements IThirdPartyOwnedRelationshipAttributeDeletedByPeerNotificationItem
{
    @validate()
    @serialize()
    public attributeId: CoreId;

    public static from(
        value: IThirdPartyOwnedRelationshipAttributeDeletedByPeerNotificationItem | Omit<ThirdPartyOwnedRelationshipAttributeDeletedByPeerNotificationItemJSON, "@type">
    ): ThirdPartyOwnedRelationshipAttributeDeletedByPeerNotificationItem {
        return this.fromAny(value);
    }
}
