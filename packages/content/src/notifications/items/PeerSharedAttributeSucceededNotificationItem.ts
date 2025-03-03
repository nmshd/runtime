import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreId, ICoreId } from "@nmshd/core-types";
import { IdentityAttribute, IdentityAttributeJSON, IIdentityAttribute, IRelationshipAttribute, RelationshipAttribute, RelationshipAttributeJSON } from "../../attributes";
import { INotificationItem, NotificationItem, NotificationItemJSON } from "../NotificationItem";

export interface PeerSharedAttributeSucceededNotificationItemJSON extends NotificationItemJSON {
    "@type": "PeerSharedAttributeSucceededNotificationItem";
    predecessorId: string;
    successorId: string;
    successorContent: IdentityAttributeJSON | RelationshipAttributeJSON;
}

export interface IPeerSharedAttributeSucceededNotificationItem extends INotificationItem {
    predecessorId: ICoreId;
    successorId: ICoreId;
    successorContent: IIdentityAttribute | IRelationshipAttribute;
}

@type("PeerSharedAttributeSucceededNotificationItem")
export class PeerSharedAttributeSucceededNotificationItem extends NotificationItem implements IPeerSharedAttributeSucceededNotificationItem {
    @validate()
    @serialize()
    public predecessorId: CoreId;

    @validate()
    @serialize()
    public successorId: CoreId;

    @validate()
    @serialize({ unionTypes: [IdentityAttribute, RelationshipAttribute] })
    public successorContent: IdentityAttribute | RelationshipAttribute;

    public static from(
        value: IPeerSharedAttributeSucceededNotificationItem | Omit<PeerSharedAttributeSucceededNotificationItemJSON, "@type">
    ): PeerSharedAttributeSucceededNotificationItem {
        return this.fromAny(value);
    }
}
