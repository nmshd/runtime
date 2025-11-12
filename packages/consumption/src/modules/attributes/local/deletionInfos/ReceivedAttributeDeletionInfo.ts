import { serialize, type, validate } from "@js-soft/ts-serval";
import { AbstractAttributeDeletionInfo, AbstractAttributeDeletionInfoJSON, IAbstractAttributeDeletionInfo } from "./AbstractAttributeDeletionInfo.js";

export enum ReceivedAttributeDeletionStatus {
    ToBeDeleted = "ToBeDeleted",
    DeletedByEmitter = "DeletedByEmitter"
}

export interface ReceivedAttributeDeletionInfoJSON extends AbstractAttributeDeletionInfoJSON {
    deletionStatus: ReceivedAttributeDeletionStatus;
}

export interface IReceivedAttributeDeletionInfo extends IAbstractAttributeDeletionInfo {
    deletionStatus: ReceivedAttributeDeletionStatus;
}

@type("ReceivedAttributeDeletionInfo")
export class ReceivedAttributeDeletionInfo extends AbstractAttributeDeletionInfo implements IReceivedAttributeDeletionInfo {
    @serialize()
    @validate({
        customValidator: (v) =>
            !Object.values(ReceivedAttributeDeletionStatus).includes(v) ? `must be one of: ${Object.values(ReceivedAttributeDeletionStatus).map((o) => `"${o}"`)}` : undefined
    })
    public override deletionStatus: ReceivedAttributeDeletionStatus;

    public static from(value: IReceivedAttributeDeletionInfo | ReceivedAttributeDeletionInfoJSON): ReceivedAttributeDeletionInfo {
        return this.fromAny(value);
    }
}
