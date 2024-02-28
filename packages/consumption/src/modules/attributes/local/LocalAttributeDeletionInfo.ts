import { serialize, validate } from "@js-soft/ts-serval";
import { CoreDate, CoreSerializable, ICoreDate } from "@nmshd/transport";

// TODO: check all places that need to be adjusted adding deletionStatus to LocalAttribute
// TODO: check all use cases that need to be adjusted if an attribute is marked for deletion

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
    @validate()
    public deletionStatus: DeletionStatus;

    @serialize()
    @validate()
    public deletionDate: CoreDate;

    public static from(value: ILocalAttributeDeletionInfo | LocalAttributeDeletionInfoJSON): LocalAttributeDeletionInfo {
        return this.fromAny(value);
    }
}
