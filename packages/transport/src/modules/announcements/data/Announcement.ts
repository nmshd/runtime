import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreAddress, CoreDate, CoreId, ICoreId } from "@nmshd/core-types";

export interface IAnnouncement extends ISerializable {
    id: ICoreId;
    createdAt: CoreAddress;
    expiresAt?: CoreDate;
    severity: AnnouncementSeverity;
    title: string;
    body: string;
}

export enum AnnouncementSeverity {
    Low = "Low",
    Medium = "Medium",
    High = "High"
}

@type("Announcement")
export class Announcement extends Serializable implements IAnnouncement {
    @validate()
    @serialize()
    public id: CoreId;

    @validate()
    @serialize()
    public createdAt: CoreAddress;

    @validate({ nullable: true })
    @serialize()
    public expiresAt?: CoreDate;

    @validate()
    @serialize()
    public severity: AnnouncementSeverity;

    @validate()
    @serialize()
    public title: string;

    @validate()
    @serialize()
    public body: string;

    public static from(value: IAnnouncement): Announcement {
        return this.fromAny(value);
    }
}
