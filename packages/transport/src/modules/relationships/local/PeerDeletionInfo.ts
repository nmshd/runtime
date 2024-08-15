import { serialize, validate } from "@js-soft/ts-serval";
import { CoreDate, CoreSerializable, ICoreDate, ICoreSerializable } from "../../../core";

export enum PeerDeletionStatus {
    ToBeDeleted = "ToBeDeleted",
    Deleted = "Deleted"
}

export interface PeerDeletionInfoJSON {
    deletionStatus: string;
    deletionDate: string;
}

export interface IPeerDeletionInfo extends ICoreSerializable {
    deletionStatus: PeerDeletionStatus;
    deletionDate: ICoreDate;
}

export class PeerDeletionInfo extends CoreSerializable implements IPeerDeletionInfo {
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
}
