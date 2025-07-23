import { serialize, validate } from "@js-soft/ts-serval";
import { AbstractAttributeDeletionInfo, AbstractAttributeDeletionInfoJSON, IAbstractAttributeDeletionInfo } from "./AbstractAttributeDeletionInfo";

export enum PeerAttributeDeletionStatus {
    ToBeDeleted = "ToBeDeleted",
    DeletedByOwner = "DeletedByOwner"
}

export interface PeerAttributeDeletionInfoJSON extends AbstractAttributeDeletionInfoJSON {
    deletionStatus: PeerAttributeDeletionStatus;
}

export interface IPeerAttributeDeletionInfo extends IAbstractAttributeDeletionInfo {
    deletionStatus: PeerAttributeDeletionStatus;
}

export class PeerAttributeDeletionInfo extends AbstractAttributeDeletionInfo implements IPeerAttributeDeletionInfo {
    @serialize()
    @validate({
        customValidator: (v) =>
            !Object.values(PeerAttributeDeletionStatus).includes(v) ? `must be one of: ${Object.values(PeerAttributeDeletionStatus).map((o) => `"${o}"`)}` : undefined
    })
    public override deletionStatus: PeerAttributeDeletionStatus;

    public static from(value: IPeerAttributeDeletionInfo | PeerAttributeDeletionInfoJSON): PeerAttributeDeletionInfo {
        return this.fromAny(value);
    }
}
