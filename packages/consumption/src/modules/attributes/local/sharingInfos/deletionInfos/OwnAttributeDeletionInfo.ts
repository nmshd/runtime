import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";
import { CoreDate, ICoreDate } from "@nmshd/core-types";

export enum OwnAttributeDeletionStatus {
    DeletionRequestSent = "DeletionRequestSent",
    DeletionRequestRejected = "DeletionRequestRejected",
    ToBeDeletedByPeer = "ToBeDeletedByPeer",
    DeletedByPeer = "DeletedByPeer"
}

export interface OwnAttributeDeletionInfoJSON {
    deletionStatus: OwnAttributeDeletionStatus;
    deletionDate: string;
}

export interface IOwnAttributeDeletionInfo extends ISerializable {
    deletionStatus: OwnAttributeDeletionStatus;
    deletionDate: ICoreDate;
}

export class OwnAttributeDeletionInfo extends Serializable implements IOwnAttributeDeletionInfo {
    @serialize()
    @validate({
        customValidator: (v) =>
            !Object.values(OwnAttributeDeletionStatus).includes(v) ? `must be one of: ${Object.values(OwnAttributeDeletionStatus).map((o) => `"${o}"`)}` : undefined
    })
    public deletionStatus: OwnAttributeDeletionStatus;

    @serialize()
    @validate()
    public deletionDate: CoreDate;

    public static from(value: IOwnAttributeDeletionInfo | OwnAttributeDeletionInfoJSON): OwnAttributeDeletionInfo {
        return this.fromAny(value);
    }
}
