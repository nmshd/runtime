import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { IdentityAttribute, IdentityAttributeJSON } from "@nmshd/content";
import { CoreId, ICoreId } from "@nmshd/core-types";
import { IPeerIdentityAttributeSharingInfo, PeerIdentityAttributeSharingInfo, PeerIdentityAttributeSharingInfoJSON } from "./PeerIdentityAttributeSharingInfo";

export interface PeerIdentityAttributeSuccessorParamsJSON {
    content: IdentityAttributeJSON;
    sharingInfo: PeerIdentityAttributeSharingInfoJSON; // TODO: omit deletionInfo?
    id?: string; // TODO: mandatory?
}

export interface IPeerIdentityAttributeSuccessorParams extends ISerializable {
    content: IdentityAttribute;
    sharingInfo: IPeerIdentityAttributeSharingInfo;
    id?: ICoreId;
}

@type("PeerIdentityAttributeSuccessorParams")
export class PeerIdentityAttributeSuccessorParams extends Serializable implements IPeerIdentityAttributeSuccessorParams {
    @validate()
    @serialize()
    public content: IdentityAttribute;

    @validate({ nullable: true })
    @serialize()
    public sharingInfo: PeerIdentityAttributeSharingInfo;

    @validate({ nullable: true })
    @serialize()
    public id?: CoreId;

    public static from(value: IPeerIdentityAttributeSuccessorParams | PeerIdentityAttributeSuccessorParamsJSON): PeerIdentityAttributeSuccessorParams {
        return this.fromAny(value);
    }
}
