import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreId, ICoreId } from "@nmshd/core-types";
import { IVerifiableCredential, VerifiableCredential, VerifiableCredentialJSON } from "../../attributes";
import { INotificationItem, NotificationItem, NotificationItemJSON } from "../NotificationItem";

export interface CreateAttributeWithKeyBindingNotificationItemJSON extends NotificationItemJSON {
    "@type": "CreateAttributeWithKeyBindingNotificationItem";
    attribute: VerifiableCredentialJSON;
    sharedAttributeId: string;
    requestId: string;
}

export interface ICreateAttributeWithKeyBindingNotificationItem extends INotificationItem {
    attribute: IVerifiableCredential;
    sharedAttributeId: ICoreId;
    requestId: ICoreId;
}

@type("CreateAttributeWithKeyBindingNotificationItem")
export class CreateAttributeWithKeyBindingNotificationItem extends NotificationItem implements ICreateAttributeWithKeyBindingNotificationItem {
    @validate()
    @serialize()
    public attribute: VerifiableCredential;

    @validate()
    @serialize()
    public sharedAttributeId: CoreId;

    @validate()
    @serialize()
    public requestId: CoreId;

    public static from(
        value: ICreateAttributeWithKeyBindingNotificationItem | Omit<CreateAttributeWithKeyBindingNotificationItemJSON, "@type">
    ): CreateAttributeWithKeyBindingNotificationItem {
        return this.fromAny(value);
    }
}
