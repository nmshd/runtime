import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreDate, CoreSerializable, ICoreDate, ICoreSerializable } from "@nmshd/transport";
import { LocalRequestStatus } from "./LocalRequestStatus";

export interface ILocalRequestStatusLogEntry extends ICoreSerializable {
    createdAt: ICoreDate;
    oldStatus: LocalRequestStatus;
    newStatus: LocalRequestStatus;
    data?: object;
    code?: string;
}

@type("LocalRequestStatusLogEntry")
export class LocalRequestStatusLogEntry extends CoreSerializable implements ILocalRequestStatusLogEntry {
    @serialize()
    @validate()
    public createdAt: CoreDate;

    @serialize()
    @validate()
    public oldStatus: LocalRequestStatus;

    @serialize()
    @validate()
    public newStatus: LocalRequestStatus;

    @serialize()
    @validate({ nullable: true })
    public data?: object;

    @serialize()
    @validate({ nullable: true })
    public code?: string;

    public static from(value: ILocalRequestStatusLogEntry): LocalRequestStatusLogEntry {
        return this.fromAny(value);
    }
}
