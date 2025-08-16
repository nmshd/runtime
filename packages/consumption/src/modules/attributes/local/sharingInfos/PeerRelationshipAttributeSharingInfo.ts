import { serialize, validate } from "@js-soft/ts-serval";
import { AbstractAttributeSharingInfo, AbstractAttributeSharingInfoJSON, IAbstractAttributeSharingInfo } from "./AbstractAttributeSharingInfo";
import { IReceivedAttributeDeletionInfo, ReceivedAttributeDeletionInfo, ReceivedAttributeDeletionInfoJSON } from "./deletionInfos";

export interface PeerRelationshipAttributeSharingInfoJSON extends AbstractAttributeSharingInfoJSON {
    deletionInfo?: ReceivedAttributeDeletionInfoJSON;
}

export interface IPeerRelationshipAttributeSharingInfo extends IAbstractAttributeSharingInfo {
    deletionInfo?: IReceivedAttributeDeletionInfo;
}

export class PeerRelationshipAttributeSharingInfo extends AbstractAttributeSharingInfo implements IPeerRelationshipAttributeSharingInfo {
    @serialize()
    @validate({ nullable: true })
    public override deletionInfo?: ReceivedAttributeDeletionInfo;

    public static from(value: IPeerRelationshipAttributeSharingInfo | PeerRelationshipAttributeSharingInfoJSON): PeerRelationshipAttributeSharingInfo {
        return super.fromAny(value) as PeerRelationshipAttributeSharingInfo;
    }
}
