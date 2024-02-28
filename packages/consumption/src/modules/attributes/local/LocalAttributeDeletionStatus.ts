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

export interface LocalAttributeDeletionStatusJSON {
    status: string;
    deletionDate: string;
}

export interface ILocalAttributeDeletionStatus {
    status: DeletionStatus;
    deletionDate: ICoreDate;
}

export class LocalAttributeDeletionStatus extends CoreSerializable implements ILocalAttributeDeletionStatus {
    @serialize()
    @validate()
    public status: DeletionStatus;

    @serialize()
    @validate()
    public deletionDate: CoreDate;

    public static from(value: ILocalAttributeDeletionStatus | LocalAttributeDeletionStatusJSON): LocalAttributeDeletionStatus {
        return this.fromAny(value);
    }
}
