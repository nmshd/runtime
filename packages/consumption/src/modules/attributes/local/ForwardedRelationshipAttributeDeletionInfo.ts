import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";
import { CoreDate, ICoreDate } from "@nmshd/core-types";

// TODO: check if forwarder can send deletion request
// TODO: this is the same as OwnAttributeDeletionInfo, but can also be set for PeerRelationshipAttributes
export enum ForwardedRelationshipAttributeDeletionStatus {
    DeletionRequestSent = "DeletionRequestSent",
    DeletionRequestRejected = "DeletionRequestRejected",
    ToBeDeletedByPeer = "ToBeDeletedByPeer",
    DeletedByPeer = "DeletedByPeer"
}

export interface ForwardedRelationshipAttributeDeletionInfoJSON {
    deletionStatus: ForwardedRelationshipAttributeDeletionStatus;
    deletionDate: string;
}

export interface IForwardedRelationshipAttributeDeletionInfo extends ISerializable {
    deletionStatus: ForwardedRelationshipAttributeDeletionStatus;
    deletionDate: ICoreDate;
}

export class ForwardedRelationshipAttributeDeletionInfo extends Serializable implements IForwardedRelationshipAttributeDeletionInfo {
    @serialize()
    @validate({
        customValidator: (v) =>
            !Object.values(ForwardedRelationshipAttributeDeletionStatus).includes(v)
                ? `must be one of: ${Object.values(ForwardedRelationshipAttributeDeletionStatus).map((o) => `"${o}"`)}`
                : undefined
    })
    public deletionStatus: ForwardedRelationshipAttributeDeletionStatus;

    @serialize()
    @validate()
    public deletionDate: CoreDate;

    public static from(value: IForwardedRelationshipAttributeDeletionInfo | ForwardedRelationshipAttributeDeletionInfoJSON): ForwardedRelationshipAttributeDeletionInfo {
        return this.fromAny(value);
    }
}
