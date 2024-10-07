import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";
import { CoreDate } from "@nmshd/core-types";

export enum PeerDeletionStatus {
    ToBeDeleted = "ToBeDeleted",
    Deleted = "Deleted"
}

export interface PeerDeletionInfoJSON {
    deletionStatus: PeerDeletionStatus;
    deletionDate: string;
}

export interface IPeerDeletionInfo extends ISerializable {
    deletionStatus: PeerDeletionStatus;
    deletionDate: CoreDate;
}

export class PeerDeletionInfo extends Serializable implements IPeerDeletionInfo {
    @serialize()
    @validate({
        customValidator: (v) => (!Object.values(PeerDeletionStatus).includes(v) ? `must be one of: ${Object.values(PeerDeletionStatus).map((o) => `"${o}"`)}` : undefined)
    })
    public deletionStatus: PeerDeletionStatus;

    @serialize()
    @validate()
    public deletionDate: CoreDate;

    public static from(value: IPeerDeletionInfo | PeerDeletionInfoJSON): PeerDeletionInfo {
        return this.fromAny(value);
    }

    public override toJSON(): PeerDeletionInfoJSON {
        return super.toJSON() as PeerDeletionInfoJSON;
    }
}
