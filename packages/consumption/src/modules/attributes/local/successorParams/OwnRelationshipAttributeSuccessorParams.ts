import { serialize, type, validate } from "@js-soft/ts-serval";
import { RelationshipAttribute, RelationshipAttributeJSON } from "@nmshd/content";
import { IOwnRelationshipAttributeSharingInfo, OwnRelationshipAttributeSharingInfo, OwnRelationshipAttributeSharingInfoJSON } from "../sharingInfos";
import { AbstractAttributeSuccessorParams, AbstractAttributeSuccessorParamsJSON, IAbstractAttributeSuccessorParams } from "./AbstractAttributeSuccessorParams";

export interface OwnRelationshipAttributeSuccessorParamsJSON extends AbstractAttributeSuccessorParamsJSON {
    content: RelationshipAttributeJSON;
    peerSharingInfo: Omit<OwnRelationshipAttributeSharingInfoJSON, "deletionInfo">;
}

export interface IOwnRelationshipAttributeSuccessorParams extends IAbstractAttributeSuccessorParams {
    content: RelationshipAttribute;
    peerSharingInfo: Omit<IOwnRelationshipAttributeSharingInfo, "deletionInfo">;
}

@type("OwnRelationshipAttributeSuccessorParams")
export class OwnRelationshipAttributeSuccessorParams extends AbstractAttributeSuccessorParams implements IOwnRelationshipAttributeSuccessorParams {
    @validate()
    @serialize()
    public override content: RelationshipAttribute;

    @validate()
    @serialize()
    public peerSharingInfo: Omit<OwnRelationshipAttributeSharingInfo, "deletionInfo">;

    public static from(value: IOwnRelationshipAttributeSuccessorParams | OwnRelationshipAttributeSuccessorParamsJSON): OwnRelationshipAttributeSuccessorParams {
        return this.fromAny(value);
    }
}
