import { serialize, validate } from "@js-soft/ts-serval";
import { AbstractAttributeDeletionInfo, AbstractAttributeDeletionInfoJSON, IAbstractAttributeDeletionInfo } from "./AbstractAttributeDeletionInfo";

export enum OwnAttributeDeletionStatus {
    DeletionRequestSent = "DeletionRequestSent",
    DeletionRequestRejected = "DeletionRequestRejected",
    ToBeDeletedByPeer = "ToBeDeletedByPeer",
    DeletedByPeer = "DeletedByPeer"
}

export interface OwnAttributeDeletionInfoJSON extends AbstractAttributeDeletionInfoJSON {
    deletionStatus: OwnAttributeDeletionStatus;
}

export interface IOwnAttributeDeletionInfo extends IAbstractAttributeDeletionInfo {
    deletionStatus: OwnAttributeDeletionStatus;
}

export class OwnAttributeDeletionInfo extends AbstractAttributeDeletionInfo implements IOwnAttributeDeletionInfo {
    @serialize()
    @validate({
        customValidator: (v) =>
            !Object.values(OwnAttributeDeletionStatus).includes(v) ? `must be one of: ${Object.values(OwnAttributeDeletionStatus).map((o) => `"${o}"`)}` : undefined
    })
    public override deletionStatus: OwnAttributeDeletionStatus;

    public static from(value: IOwnAttributeDeletionInfo | OwnAttributeDeletionInfoJSON): OwnAttributeDeletionInfo {
        return this.fromAny(value);
    }
}
