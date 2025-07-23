import { serialize, validate } from "@js-soft/ts-serval";
import { AbstractAttributeDeletionInfo, AbstractAttributeDeletionInfoJSON, IAbstractAttributeDeletionInfo } from "./AbstractAttributeDeletionInfo";

// TODO: check if forwarder can send deletion request
// TODO: this is the same as OwnAttributeDeletionInfo, but can also be set for PeerRelationshipAttributes
export enum ForwardedRelationshipAttributeDeletionStatus {
    DeletionRequestSent = "DeletionRequestSent",
    DeletionRequestRejected = "DeletionRequestRejected",
    ToBeDeletedByPeer = "ToBeDeletedByPeer",
    DeletedByPeer = "DeletedByPeer"
}

export interface ForwardedRelationshipAttributeDeletionInfoJSON extends AbstractAttributeDeletionInfoJSON {
    deletionStatus: ForwardedRelationshipAttributeDeletionStatus;
}

export interface IForwardedRelationshipAttributeDeletionInfo extends IAbstractAttributeDeletionInfo {
    deletionStatus: ForwardedRelationshipAttributeDeletionStatus;
}

export class ForwardedRelationshipAttributeDeletionInfo extends AbstractAttributeDeletionInfo implements IForwardedRelationshipAttributeDeletionInfo {
    @serialize()
    @validate({
        customValidator: (v) =>
            !Object.values(ForwardedRelationshipAttributeDeletionStatus).includes(v)
                ? `must be one of: ${Object.values(ForwardedRelationshipAttributeDeletionStatus).map((o) => `"${o}"`)}`
                : undefined
    })
    public override deletionStatus: ForwardedRelationshipAttributeDeletionStatus;

    public static from(value: IForwardedRelationshipAttributeDeletionInfo | ForwardedRelationshipAttributeDeletionInfoJSON): ForwardedRelationshipAttributeDeletionInfo {
        return this.fromAny(value);
    }
}
