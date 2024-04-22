import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreId, ICoreId } from "@nmshd/transport";
import { INotificationItem, NotificationItem, NotificationItemJSON } from "../NotificationItem";

export interface ThirdPartyOwnedRelationshipAttributeDeletedByPeerNotificationItemJSON extends NotificationItemJSON {
    "@type": "ThirdPartyOwnedRelationshipAttributeDeletedByPeerNotificationItem";
    attributeId: string;
}

export interface IThirdPartyOwnedRelationshipAttributeDeletedByPeerNotificationItem extends INotificationItem {
    attributeId: ICoreId;
}

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
