import { serialize, type, validate } from "@js-soft/ts-serval";
import { AbstractAttributeSharingDetails, AbstractAttributeSharingDetailsJSON, IAbstractAttributeSharingDetails } from "./AbstractAttributeSharingDetails";
import { IReceivedAttributeDeletionInfo, ReceivedAttributeDeletionInfo, ReceivedAttributeDeletionInfoJSON } from "./deletionInfos";

export interface PeerRelationshipAttributeSharingDetailsJSON extends AbstractAttributeSharingDetailsJSON {
    deletionInfo?: ReceivedAttributeDeletionInfoJSON;
}

export interface IPeerRelationshipAttributeSharingDetails extends IAbstractAttributeSharingDetails {
    deletionInfo?: IReceivedAttributeDeletionInfo;
}

@type("PeerRelationshipAttributeSharingDetails")
export class PeerRelationshipAttributeSharingDetails extends AbstractAttributeSharingDetails implements IPeerRelationshipAttributeSharingDetails {
    @serialize()
    @validate({ nullable: true })
    public override deletionInfo?: ReceivedAttributeDeletionInfo;

    public static from(value: IPeerRelationshipAttributeSharingDetails | PeerRelationshipAttributeSharingDetailsJSON): PeerRelationshipAttributeSharingDetails {
        return super.fromAny(value) as PeerRelationshipAttributeSharingDetails;
    }
}
