import { serialize, type, validate } from "@js-soft/ts-serval";
import { AbstractAttributeDeletionInfo, AbstractAttributeDeletionInfoJSON, IAbstractAttributeDeletionInfo } from "./AbstractAttributeDeletionInfo.js";

export enum EmittedAttributeDeletionStatus {
    DeletionRequestSent = "DeletionRequestSent",
    DeletionRequestRejected = "DeletionRequestRejected",
    ToBeDeletedByRecipient = "ToBeDeletedByRecipient",
    DeletedByRecipient = "DeletedByRecipient"
}

export interface EmittedAttributeDeletionInfoJSON extends AbstractAttributeDeletionInfoJSON {
    deletionStatus: EmittedAttributeDeletionStatus;
}

export interface IEmittedAttributeDeletionInfo extends IAbstractAttributeDeletionInfo {
    deletionStatus: EmittedAttributeDeletionStatus;
}

@type("EmittedAttributeDeletionInfo")
export class EmittedAttributeDeletionInfo extends AbstractAttributeDeletionInfo implements IEmittedAttributeDeletionInfo {
    @serialize()
    @validate({
        customValidator: (v) =>
            !Object.values(EmittedAttributeDeletionStatus).includes(v) ? `must be one of: ${Object.values(EmittedAttributeDeletionStatus).map((o) => `"${o}"`)}` : undefined
    })
    public override deletionStatus: EmittedAttributeDeletionStatus;

    public static from(value: IEmittedAttributeDeletionInfo | EmittedAttributeDeletionInfoJSON): EmittedAttributeDeletionInfo {
        return this.fromAny(value);
    }
}
