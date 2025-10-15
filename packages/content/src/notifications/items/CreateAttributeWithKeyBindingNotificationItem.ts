import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreId, ICoreId } from "@nmshd/core-types";
import {
    IdentityAttribute,
    IdentityAttributeJSON,
    IIdentityAttribute,
    IVerifiableCredential,
    RelationshipAttribute,
    VerifiableCredential,
    VerifiableCredentialJSON
} from "../../attributes";
import { INotificationItem, NotificationItem, NotificationItemJSON } from "../NotificationItem";

export interface CreateAttributeWithKeyBindingNotificationItemJSON extends NotificationItemJSON {
    "@type": "CreateAttributeWithKeyBindingNotificationItem";
    attribute: IdentityAttributeJSON<VerifiableCredentialJSON>;
    requestId: string;
    requestItemIdentifier: number[];
}

export interface ICreateAttributeWithKeyBindingNotificationItem extends INotificationItem {
    attribute: IIdentityAttribute<IVerifiableCredential>;
    requestId: ICoreId;
    requestItemIdentifier: number[];
}

@type("CreateAttributeWithKeyBindingNotificationItem")
export class CreateAttributeWithKeyBindingNotificationItem extends NotificationItem implements ICreateAttributeWithKeyBindingNotificationItem {
    @validate()
    @serialize({ unionTypes: [IdentityAttribute, RelationshipAttribute] })
    public attribute: IdentityAttribute<VerifiableCredential>;

    @validate()
    @serialize()
    public requestId: CoreId;

    @validate()
    @serialize()
    public requestItemIdentifier: number[];

    public static from(
        value: ICreateAttributeWithKeyBindingNotificationItem | Omit<CreateAttributeWithKeyBindingNotificationItemJSON, "@type">
    ): CreateAttributeWithKeyBindingNotificationItem {
        return this.fromAny(value);
    }
}
