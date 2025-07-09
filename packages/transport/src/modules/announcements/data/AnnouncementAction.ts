import { Serializable, serialize, type, validate } from "@js-soft/ts-serval";

export interface IAnnouncementAction {
    displayName: string;
    link: string;
}

@type("AnnouncementAction")
export class AnnouncementAction extends Serializable implements IAnnouncementAction {
    @validate()
    @serialize()
    public displayName: string;

    @validate()
    @serialize()
    public link: string;

    public static from(value: IAnnouncementAction): AnnouncementAction {
        return this.fromAny(value);
    }
}
