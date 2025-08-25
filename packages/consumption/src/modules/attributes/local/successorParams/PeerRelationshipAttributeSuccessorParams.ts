import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { RelationshipAttribute, RelationshipAttributeJSON } from "@nmshd/content";
import { CoreId, ICoreId } from "@nmshd/core-types";
import { IPeerRelationshipAttributeSharingInfo, PeerRelationshipAttributeSharingInfo, PeerRelationshipAttributeSharingInfoJSON } from "../sharingInfos";

export interface PeerRelationshipAttributeSuccessorParamsJSON {
    content: RelationshipAttributeJSON;
    id: string;
    peerSharingInfo: Omit<PeerRelationshipAttributeSharingInfoJSON, "deletionInfo">;
}

export interface IPeerRelationshipAttributeSuccessorParams extends ISerializable {
    content: RelationshipAttribute;
    id: ICoreId;
    peerSharingInfo: Omit<IPeerRelationshipAttributeSharingInfo, "deletionInfo">;
}

@type("PeerRelationshipAttributeSuccessorParams")
export class PeerRelationshipAttributeSuccessorParams extends Serializable implements IPeerRelationshipAttributeSuccessorParams {
    @validate()
    @serialize()
    public content: RelationshipAttribute;

    @validate()
    @serialize()
    public id: CoreId;

    @validate()
    @serialize()
    public peerSharingInfo: Omit<PeerRelationshipAttributeSharingInfo, "deletionInfo">;

    public static from(value: IPeerRelationshipAttributeSuccessorParams | PeerRelationshipAttributeSuccessorParamsJSON): PeerRelationshipAttributeSuccessorParams {
        return this.fromAny(value);
    }
}
