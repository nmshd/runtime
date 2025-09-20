import { serialize, type, validate } from "@js-soft/ts-serval";
import { AbstractAttributeSharingDetails, AbstractAttributeSharingDetailsJSON, IAbstractAttributeSharingDetails } from "./AbstractAttributeSharingDetails";
import { IReceivedAttributeDeletionInfo, ReceivedAttributeDeletionInfo, ReceivedAttributeDeletionInfoJSON } from "./deletionInfos";

export interface PeerIdentityAttributeSharingDetailsJSON extends AbstractAttributeSharingDetailsJSON {
    deletionInfo?: ReceivedAttributeDeletionInfoJSON;
}

export interface IPeerIdentityAttributeSharingDetails extends IAbstractAttributeSharingDetails {
    deletionInfo?: IReceivedAttributeDeletionInfo;
}

@type("PeerIdentityAttributeSharingDetails")
export class PeerIdentityAttributeSharingDetails extends AbstractAttributeSharingDetails implements IPeerIdentityAttributeSharingDetails {
    @serialize()
    @validate({ nullable: true })
    public override deletionInfo?: ReceivedAttributeDeletionInfo;

    public static from(value: IPeerIdentityAttributeSharingDetails | PeerIdentityAttributeSharingDetailsJSON): PeerIdentityAttributeSharingDetails {
        return super.fromAny(value) as PeerIdentityAttributeSharingDetails;
    }
}
