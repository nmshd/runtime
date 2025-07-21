import { serialize, type, validate } from "@js-soft/ts-serval";
import { RelationshipAttribute, RelationshipAttributeJSON } from "@nmshd/content";
import { CoreId, ICoreId } from "@nmshd/core-types";
import { IPeerRelationshipAttributeSharingInfo, PeerRelationshipAttributeSharingInfo, PeerRelationshipAttributeSharingInfoJSON } from "../PeerRelationshipAttributeSharingInfo";
import { AbstractAttributeSuccessorParams, AbstractAttributeSuccessorParamsJSON, IAbstractAttributeSuccessorParams } from "./AbstractAttributeSuccessorParams";

export interface PeerRelationshipAttributeSuccessorParamsJSON extends AbstractAttributeSuccessorParamsJSON {
    content: RelationshipAttributeJSON;
    id: string;
    initialSharingInfo: Omit<PeerRelationshipAttributeSharingInfoJSON, "deletionInfo">;
}

export interface IPeerRelationshipAttributeSuccessorParams extends IAbstractAttributeSuccessorParams {
    content: RelationshipAttribute;
    id: ICoreId;
    initialSharingInfo: Omit<IPeerRelationshipAttributeSharingInfo, "deletionInfo">;
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
    public initialSharingInfo: Omit<PeerRelationshipAttributeSharingInfo, "deletionInfo">;

    public static from(value: IPeerRelationshipAttributeSuccessorParams | PeerRelationshipAttributeSuccessorParamsJSON): PeerRelationshipAttributeSuccessorParams {
        return this.fromAny(value);
    }
}
