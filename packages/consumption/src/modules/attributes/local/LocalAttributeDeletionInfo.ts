import { serialize, validate } from "@js-soft/ts-serval";
import { CoreDate, CoreSerializable, ICoreDate } from "@nmshd/transport";

export enum DeletionStatus {
    ToBeDeleted = "ToBeDeleted",
    ToBeDeletedByPeer = "ToBeDeletedByPeer",
    DeletedByPeer = "DeletedByPeer",
    DeletedByOwner = "DeletedByOwner"
}

export interface LocalAttributeDeletionInfoJSON {
    deletionStatus: string;
    deletionDate: string;
}

export interface ILocalAttributeDeletionInfo {
    deletionStatus: DeletionStatus;
    deletionDate: ICoreDate;
}

export class LocalAttributeDeletionInfo extends CoreSerializable implements ILocalAttributeDeletionInfo {
    @serialize()
    @validate({
        customValidator: (v) => (!Object.values(DeletionStatus).includes(v) ? `must be one of: ${Object.values(DeletionStatus).map((o) => `"${o}"`)}` : undefined)
    })
    public deletionStatus: DeletionStatus;

    @serialize()
    @validate()
    public deletionDate: CoreDate;

    public static from(value: ILocalAttributeDeletionInfo | LocalAttributeDeletionInfoJSON): LocalAttributeDeletionInfo {
        return this.fromAny(value);
    }
}
