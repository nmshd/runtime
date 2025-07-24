import { serialize, validate } from "@js-soft/ts-serval";
import { AbstractAttributeDeletionInfo, AbstractAttributeDeletionInfoJSON, IAbstractAttributeDeletionInfo } from "./AbstractAttributeDeletionInfo";

export enum ForwardedAttributeDeletionStatus {
    DeletionRequestSent = "DeletionRequestSent",
    DeletionRequestRejected = "DeletionRequestRejected",
    ToBeDeletedByPeer = "ToBeDeletedByPeer",
    DeletedByPeer = "DeletedByPeer"
}

export interface ForwardedAttributeDeletionInfoJSON extends AbstractAttributeDeletionInfoJSON {
    deletionStatus: ForwardedAttributeDeletionStatus;
}

export interface IForwardedAttributeDeletionInfo extends IAbstractAttributeDeletionInfo {
    deletionStatus: ForwardedAttributeDeletionStatus;
}

export class ForwardedAttributeDeletionInfo extends AbstractAttributeDeletionInfo implements IForwardedAttributeDeletionInfo {
    @serialize()
    @validate({
        customValidator: (v) =>
            !Object.values(ForwardedAttributeDeletionStatus).includes(v) ? `must be one of: ${Object.values(ForwardedAttributeDeletionStatus).map((o) => `"${o}"`)}` : undefined
    })
    public override deletionStatus: ForwardedAttributeDeletionStatus;

    public static from(value: IForwardedAttributeDeletionInfo | ForwardedAttributeDeletionInfoJSON): ForwardedAttributeDeletionInfo {
        return this.fromAny(value);
    }
}
