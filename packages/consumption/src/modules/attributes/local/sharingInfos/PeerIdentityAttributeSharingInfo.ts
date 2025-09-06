import { serialize, type, validate } from "@js-soft/ts-serval";
import { AbstractAttributeSharingInfo, AbstractAttributeSharingInfoJSON, IAbstractAttributeSharingInfo } from "./AbstractAttributeSharingInfo";
import { IReceivedAttributeDeletionInfo, ReceivedAttributeDeletionInfo, ReceivedAttributeDeletionInfoJSON } from "./deletionInfos";

export interface PeerIdentityAttributeSharingInfoJSON extends AbstractAttributeSharingInfoJSON {
    deletionInfo?: ReceivedAttributeDeletionInfoJSON;
}

export interface IPeerIdentityAttributeSharingInfo extends IAbstractAttributeSharingInfo {
    deletionInfo?: IReceivedAttributeDeletionInfo;
}

@type("PeerIdentityAttributeSharingInfo")
export class PeerIdentityAttributeSharingInfo extends AbstractAttributeSharingInfo implements IPeerIdentityAttributeSharingInfo {
    @serialize()
    @validate({ nullable: true })
    public override deletionInfo?: ReceivedAttributeDeletionInfo;

    public static from(value: IPeerIdentityAttributeSharingInfo | PeerIdentityAttributeSharingInfoJSON): PeerIdentityAttributeSharingInfo {
        return super.fromAny(value) as PeerIdentityAttributeSharingInfo;
    }
}
