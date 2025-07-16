import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";
import { CoreAddress, CoreDate, CoreId, ICoreAddress, ICoreDate, ICoreId } from "@nmshd/core-types";
import { IPeerAttributeDeletionInfo, PeerAttributeDeletionInfo, PeerAttributeDeletionInfoJSON } from "./PeerAttributeDeletionInfo";

export interface PeerIdentityAttributeSharingInfoJSON {
    peer: string;
    sourceReference: string;
    sharedAt: string;
    deletionInfo?: PeerAttributeDeletionInfoJSON;
}

export interface IPeerIdentityAttributeSharingInfo extends ISerializable {
    peer: ICoreAddress;
    sourceReference: ICoreId;
    sharedAt: ICoreDate;
    deletionInfo?: IPeerAttributeDeletionInfo;
}

export class PeerIdentityAttributeSharingInfo extends Serializable implements IPeerIdentityAttributeSharingInfo {
    @validate()
    @serialize()
    public peer: CoreAddress;

    @serialize()
    @validate()
    public sourceReference: CoreId;

    @serialize()
    @validate()
    public sharedAt: CoreDate;

    @serialize()
    @validate({ nullable: true })
    public deletionInfo?: PeerAttributeDeletionInfo;

    public static from(value: IPeerIdentityAttributeSharingInfo | PeerIdentityAttributeSharingInfoJSON): PeerIdentityAttributeSharingInfo {
        return super.fromAny(value) as PeerIdentityAttributeSharingInfo;
    }
}
