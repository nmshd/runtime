import { ISerializable, Serializable } from "@js-soft/ts-serval";

export interface NotificationItemJSON {}

export interface INotificationItem extends ISerializable {}

export abstract class NotificationItem extends Serializable implements INotificationItem {}
