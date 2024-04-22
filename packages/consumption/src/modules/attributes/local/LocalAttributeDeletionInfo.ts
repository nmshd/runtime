import { serialize, validate } from "@js-soft/ts-serval";
import { CoreDate, CoreSerializable, ICoreDate } from "@nmshd/transport";

// export enum DeletionStatus {
//     ToBeDeleted = <string>"ToBeDeleted",
//     ToBeDeletedByPeer = <any>"ToBeDeletedByPeer",
//     DeletedByPeer = "DeletedByPeer" as "DeletedByPeer",
//     DeletedByOwner = "DeletedByOwner"
// }

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
    // {
    // customValidator: (v) =>
    //     !Number.isInteger(v) || !DeletionStatus[v]
    //         ? `must be one of the defined deletion statuses: ${DeletionStatus.ToBeDeleted}, ${DeletionStatus.ToBeDeletedByPeer}, ${DeletionStatus.DeletedByPeer} or ${DeletionStatus.DeletedByOwner}`
    //         : undefined
    // }
    public deletionStatus: DeletionStatus;

    @serialize()
    @validate()
    public deletionDate: CoreDate;

    public static from(value: ILocalAttributeDeletionInfo | LocalAttributeDeletionInfoJSON): LocalAttributeDeletionInfo {
        return this.fromAny(value);
    }
}
