import { serialize, validate } from "@js-soft/ts-serval";
import { CoreSerializable, ICoreSerializable } from "../../../core";

export enum PeerDeletionStatus {
    ToBeDeleted = "ToBeDeleted",
    Deleted = "Deleted"
}

export interface PeerDeletionInfoJSON {
    deletionStatus: PeerDeletionStatus;
}

export interface IPeerDeletionInfo extends ICoreSerializable {
    deletionStatus: PeerDeletionStatus;
}

export class PeerDeletionInfo extends CoreSerializable implements IPeerDeletionInfo {
    @serialize()
    @validate({
        customValidator: (v) => (!Object.values(PeerDeletionStatus).includes(v) ? `must be one of: ${Object.values(PeerDeletionStatus).map((o) => `"${o}"`)}` : undefined)
    })
    public deletionStatus: PeerDeletionStatus;

    public static from(value: IPeerDeletionInfo | PeerDeletionInfoJSON): PeerDeletionInfo {
        return this.fromAny(value);
    }
}
