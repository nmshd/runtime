import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { IdentityAttribute, IdentityAttributeJSON } from "@nmshd/content";
import { CoreId, ICoreId } from "@nmshd/core-types";
import { IPeerIdentityAttributeSharingInfo, PeerIdentityAttributeSharingInfo, PeerIdentityAttributeSharingInfoJSON } from "../sharingInfos";

export interface PeerIdentityAttributeSuccessorParamsJSON {
    content: IdentityAttributeJSON;
    id: string;
    peerSharingInfo: Omit<PeerIdentityAttributeSharingInfoJSON, "deletionInfo">;
}

export interface IPeerIdentityAttributeSuccessorParams extends ISerializable {
    content: IdentityAttribute;
    id: ICoreId;
    peerSharingInfo: Omit<IPeerIdentityAttributeSharingInfo, "deletionInfo">;
}

@type("PeerIdentityAttributeSuccessorParams")
export class PeerIdentityAttributeSuccessorParams extends Serializable implements IPeerIdentityAttributeSuccessorParams {
    @validate()
    @serialize()
    public content: IdentityAttribute;

    @validate()
    @serialize()
    public id: CoreId;

    @validate({ nullable: true })
    @serialize()
    public peerSharingInfo: Omit<PeerIdentityAttributeSharingInfo, "deletionInfo">;

    public static from(value: IPeerIdentityAttributeSuccessorParams | PeerIdentityAttributeSuccessorParamsJSON): PeerIdentityAttributeSuccessorParams {
        return this.fromAny(value);
    }
}
