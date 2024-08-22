import { serialize, validate } from "@js-soft/ts-serval";
import { CoreDate, CoreSerializable, ICoreDate } from "@nmshd/transport";

export enum LocalAttributeDeletionInfoStatus {
    DeletionRequestSent = "DeletionRequestSent",
    DeletionRequestRejected = "DeletionRequestRejected",
    ToBeDeleted = "ToBeDeleted",
    ToBeDeletedByPeer = "ToBeDeletedByPeer",
    DeletedByPeer = "DeletedByPeer",
    DeletedByOwner = "DeletedByOwner"
}

export interface LocalAttributeDeletionInfoJSON {
    deletionStatus: LocalAttributeDeletionInfoStatus;
    deletionDate: string;
}

export interface ILocalAttributeDeletionInfo {
    deletionStatus: LocalAttributeDeletionInfoStatus;
    deletionDate: ICoreDate;
}

export class LocalAttributeDeletionInfo extends CoreSerializable implements ILocalAttributeDeletionInfo {
    @serialize()
    @validate({
        customValidator: (v) =>
            !Object.values(LocalAttributeDeletionInfoStatus).includes(v) ? `must be one of: ${Object.values(LocalAttributeDeletionInfoStatus).map((o) => `"${o}"`)}` : undefined
    })
    public deletionStatus: LocalAttributeDeletionInfoStatus;

    @serialize()
    @validate()
    public deletionDate: CoreDate;

    public static from(value: ILocalAttributeDeletionInfo | LocalAttributeDeletionInfoJSON): LocalAttributeDeletionInfo {
        return this.fromAny(value);
    }
}
