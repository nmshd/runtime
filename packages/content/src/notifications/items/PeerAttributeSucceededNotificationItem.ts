import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreId, ICoreId } from "@nmshd/core-types";
import { IdentityAttribute, IdentityAttributeJSON, IIdentityAttribute, IRelationshipAttribute, RelationshipAttribute, RelationshipAttributeJSON } from "../../attributes/index.js";
import { INotificationItem, NotificationItem, NotificationItemJSON } from "../NotificationItem.js";

export interface PeerAttributeSucceededNotificationItemJSON extends NotificationItemJSON {
    "@type": "PeerAttributeSucceededNotificationItem";
    predecessorId: string;
    successorId: string;
    successorContent: IdentityAttributeJSON | RelationshipAttributeJSON;
}

export interface IPeerAttributeSucceededNotificationItem extends INotificationItem {
    predecessorId: ICoreId;
    successorId: ICoreId;
    successorContent: IIdentityAttribute | IRelationshipAttribute;
}

@type("PeerAttributeSucceededNotificationItem")
export class PeerAttributeSucceededNotificationItem extends NotificationItem implements IPeerAttributeSucceededNotificationItem {
    @validate()
    @serialize()
    public predecessorId: CoreId;

    @validate()
    @serialize()
    public successorId: CoreId;

    @validate()
    @serialize({ unionTypes: [IdentityAttribute, RelationshipAttribute] })
    public successorContent: IdentityAttribute | RelationshipAttribute;

    public static from(value: IPeerAttributeSucceededNotificationItem | Omit<PeerAttributeSucceededNotificationItemJSON, "@type">): PeerAttributeSucceededNotificationItem {
        return this.fromAny(value);
    }
}
