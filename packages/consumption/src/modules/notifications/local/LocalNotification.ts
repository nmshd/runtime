import { Serializable, serialize, type, validate, ValidationError } from "@js-soft/ts-serval";
import { INotification, Notification } from "@nmshd/content";
import { CoreAddress, CoreDate, CoreId, ICoreAddress, ICoreDate, ICoreId } from "@nmshd/core-types";
import { CoreSynchronizable, ICoreSynchronizable } from "@nmshd/transport";
import { nameof } from "ts-simple-nameof";
import { ConsumptionError } from "../../../consumption/ConsumptionError.js";
import { ILocalNotificationSource, LocalNotificationSource } from "./LocalNotificationSource.js";

export enum LocalNotificationStatus {
    Open = "Open",
    Sent = "Sent",
    Completed = "Completed",
    Error = "Error"
}

export interface ILocalNotification extends ICoreSynchronizable {
    isOwn: boolean;
    peer: ICoreAddress;
    createdAt: ICoreDate;
    receivedByDevice?: ICoreId;
    content: INotification;
    status: LocalNotificationStatus;
    source: ILocalNotificationSource;
}

@type("LocalNotification")
export class LocalNotification extends CoreSynchronizable implements ILocalNotification {
    public override readonly technicalProperties = [
        "@type",
        "@context",
        nameof<LocalNotification>((r) => r.isOwn),
        nameof<LocalNotification>((r) => r.peer),
        nameof<LocalNotification>((r) => r.createdAt),
        nameof<LocalNotification>((r) => r.receivedByDevice),
        nameof<LocalNotification>((r) => r.status),
        nameof<LocalNotification>((r) => r.source)
    ];

    public override readonly userdataProperties = [nameof<LocalNotification>((r) => r.content)];

    @serialize()
    @validate()
    public isOwn: boolean;

    @serialize()
    @validate()
    public peer: CoreAddress;

    @serialize()
    @validate()
    public createdAt: CoreDate;

    @serialize()
    @validate({ nullable: true })
    public receivedByDevice?: CoreId;

    @serialize()
    @validate()
    public content: Notification;

    @serialize()
    @validate()
    public status: LocalNotificationStatus;

    @serialize()
    @validate()
    public source: LocalNotificationSource;

    protected static override postFrom<T extends Serializable>(value: T): T {
        if (!(value instanceof LocalNotification)) {
            throw new ConsumptionError("this should never happen");
        }

        if (value.isOwn && value.receivedByDevice) {
            throw new ValidationError(
                LocalNotification.name,
                nameof<LocalNotification>((x) => x.receivedByDevice),
                `You cannot define ${nameof<LocalNotification>((x) => x.receivedByDevice)} for an own message.`
            );
        }

        if (!value.isOwn && !value.receivedByDevice) {
            throw new ValidationError(
                LocalNotification.name,
                nameof<LocalNotification>((x) => x.receivedByDevice),
                `You must define ${nameof<LocalNotification>((x) => x.receivedByDevice)} for a peer message.`
            );
        }

        return value;
    }

    public static from(value: ILocalNotification): LocalNotification {
        return this.fromAny(value);
    }
}
