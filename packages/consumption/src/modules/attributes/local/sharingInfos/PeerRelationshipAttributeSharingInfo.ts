import { serialize, validate } from "@js-soft/ts-serval";
import { AbstractAttributeSharingInfo, AbstractAttributeSharingInfoJSON, IAbstractAttributeSharingInfo } from "./AbstractAttributeSharingInfo";
import { IPeerAttributeDeletionInfo, PeerAttributeDeletionInfo, PeerAttributeDeletionInfoJSON } from "./deletionInfos";

export interface PeerRelationshipAttributeSharingInfoJSON extends AbstractAttributeSharingInfoJSON {
    deletionInfo?: PeerAttributeDeletionInfoJSON;
}

export interface IPeerRelationshipAttributeSharingInfo extends IAbstractAttributeSharingInfo {
    deletionInfo?: IPeerAttributeDeletionInfo;
}

export class PeerRelationshipAttributeSharingInfo extends AbstractAttributeSharingInfo implements IPeerRelationshipAttributeSharingInfo {
    @serialize()
    @validate({ nullable: true })
    public override deletionInfo?: PeerAttributeDeletionInfo;

    public static from(value: IPeerRelationshipAttributeSharingInfo | PeerRelationshipAttributeSharingInfoJSON): PeerRelationshipAttributeSharingInfo {
        return super.fromAny(value) as PeerRelationshipAttributeSharingInfo;
    }
}
