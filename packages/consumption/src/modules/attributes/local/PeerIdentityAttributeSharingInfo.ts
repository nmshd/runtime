import { serialize, validate } from "@js-soft/ts-serval";
import { AbstractAttributeSharingInfo, AbstractAttributeSharingInfoJSON, IAbstractAttributeSharingInfo } from "./AbstractAttributeSharingInfo";
import { IPeerAttributeDeletionInfo, PeerAttributeDeletionInfo, PeerAttributeDeletionInfoJSON } from "./PeerAttributeDeletionInfo";

export interface PeerIdentityAttributeSharingInfoJSON extends AbstractAttributeSharingInfoJSON {
    deletionInfo?: PeerAttributeDeletionInfoJSON;
}

export interface IPeerIdentityAttributeSharingInfo extends IAbstractAttributeSharingInfo {
    deletionInfo?: IPeerAttributeDeletionInfo;
}

export class PeerIdentityAttributeSharingInfo extends AbstractAttributeSharingInfo implements IPeerIdentityAttributeSharingInfo {
    @serialize()
    @validate({ nullable: true })
    public override deletionInfo?: PeerAttributeDeletionInfo;

    public static from(value: IPeerIdentityAttributeSharingInfo | PeerIdentityAttributeSharingInfoJSON): PeerIdentityAttributeSharingInfo {
        return super.fromAny(value) as PeerIdentityAttributeSharingInfo;
    }
}
