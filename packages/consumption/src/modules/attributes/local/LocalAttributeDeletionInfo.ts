import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";
import { CoreDate, ICoreDate } from "@nmshd/core-types";

export enum LocalAttributeDeletionStatus {
    DeletionRequestSent = "DeletionRequestSent",
    DeletionRequestRejected = "DeletionRequestRejected",
    ToBeDeleted = "ToBeDeleted",
    ToBeDeletedByPeer = "ToBeDeletedByPeer",
    DeletedByPeer = "DeletedByPeer",
    DeletedByOwner = "DeletedByOwner"
}

export interface LocalAttributeDeletionInfoJSON {
    deletionStatus: LocalAttributeDeletionStatus;
    deletionDate: string;
}

export interface ILocalAttributeDeletionInfo extends ISerializable {
    deletionStatus: LocalAttributeDeletionStatus;
    deletionDate: ICoreDate;
}

export class LocalAttributeDeletionInfo extends Serializable implements ILocalAttributeDeletionInfo {
    @serialize()
    @validate({
        customValidator: (v) =>
            !Object.values(LocalAttributeDeletionStatus).includes(v) ? `must be one of: ${Object.values(LocalAttributeDeletionStatus).map((o) => `"${o}"`)}` : undefined
    })
    public deletionStatus: LocalAttributeDeletionStatus;

    @serialize()
    @validate()
    public deletionDate: CoreDate;

    public static from(value: ILocalAttributeDeletionInfo | LocalAttributeDeletionInfoJSON): LocalAttributeDeletionInfo {
        return this.fromAny(value);
    }
}
