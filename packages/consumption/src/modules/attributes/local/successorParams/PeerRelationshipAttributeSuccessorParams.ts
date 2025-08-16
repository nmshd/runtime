import { serialize, type, validate } from "@js-soft/ts-serval";
import { RelationshipAttribute, RelationshipAttributeJSON } from "@nmshd/content";
import { CoreId, ICoreId } from "@nmshd/core-types";
import { IPeerRelationshipAttributeSharingInfo, PeerRelationshipAttributeSharingInfo, PeerRelationshipAttributeSharingInfoJSON } from "../sharingInfos";
import { AbstractAttributeSuccessorParams, AbstractAttributeSuccessorParamsJSON, IAbstractAttributeSuccessorParams } from "./AbstractAttributeSuccessorParams";

export interface PeerRelationshipAttributeSuccessorParamsJSON extends AbstractAttributeSuccessorParamsJSON {
    content: RelationshipAttributeJSON;
    id: string;
    peerSharingInfo: Omit<PeerRelationshipAttributeSharingInfoJSON, "deletionInfo">;
}

export interface IPeerRelationshipAttributeSuccessorParams extends IAbstractAttributeSuccessorParams {
    content: RelationshipAttribute;
    id: ICoreId;
    peerSharingInfo: Omit<IPeerRelationshipAttributeSharingInfo, "deletionInfo">;
}

@type("PeerRelationshipAttributeSuccessorParams")
export class PeerRelationshipAttributeSuccessorParams extends AbstractAttributeSuccessorParams implements IPeerRelationshipAttributeSuccessorParams {
    @validate()
    @serialize()
    public override content: RelationshipAttribute;

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
