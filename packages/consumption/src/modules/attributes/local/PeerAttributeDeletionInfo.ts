import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";
import { CoreDate, ICoreDate } from "@nmshd/core-types";

export enum PeerAttributeDeletionStatus {
    DeletionRequestSent = "DeletionRequestSent",
    DeletionRequestRejected = "DeletionRequestRejected",
    ToBeDeleted = "ToBeDeleted",
    DeletedByOwner = "DeletedByOwner"
}

export interface PeerAttributeDeletionInfoJSON {
    deletionStatus: PeerAttributeDeletionStatus;
    deletionDate: string;
}

export interface IPeerAttributeDeletionInfo extends ISerializable {
    deletionStatus: PeerAttributeDeletionStatus;
    deletionDate: ICoreDate;
}

export class PeerAttributeDeletionInfo extends Serializable implements IPeerAttributeDeletionInfo {
    @serialize()
    @validate({
        customValidator: (v) =>
            !Object.values(PeerAttributeDeletionStatus).includes(v) ? `must be one of: ${Object.values(PeerAttributeDeletionStatus).map((o) => `"${o}"`)}` : undefined
    })
    public deletionStatus: PeerAttributeDeletionStatus;

    @serialize()
    @validate()
    public deletionDate: CoreDate;

    public static from(value: IPeerAttributeDeletionInfo | PeerAttributeDeletionInfoJSON): PeerAttributeDeletionInfo {
        return this.fromAny(value);
    }
}
