import { serialize, type, validate } from "@js-soft/ts-serval";
import { RelationshipAttribute, RelationshipAttributeJSON } from "@nmshd/content";
import { IOwnRelationshipAttributeSharingInfo, OwnRelationshipAttributeSharingInfo, OwnRelationshipAttributeSharingInfoJSON } from "../OwnRelationshipAttributeSharingInfo";
import { AbstractAttributeSuccessorParams, AbstractAttributeSuccessorParamsJSON, IAbstractAttributeSuccessorParams } from "./AbstractAttributeSuccessorParams";

export interface OwnRelationshipAttributeSuccessorParamsJSON extends AbstractAttributeSuccessorParamsJSON {
    content: RelationshipAttributeJSON;
    initialSharingInfo: Omit<OwnRelationshipAttributeSharingInfoJSON, "deletionInfo">;
}

export interface IOwnRelationshipAttributeSuccessorParams extends IAbstractAttributeSuccessorParams {
    content: RelationshipAttribute;
    initialSharingInfo: Omit<IOwnRelationshipAttributeSharingInfo, "deletionInfo">;
}

@type("OwnRelationshipAttributeSuccessorParams")
export class OwnRelationshipAttributeSuccessorParams extends AbstractAttributeSuccessorParams implements IOwnRelationshipAttributeSuccessorParams {
    @validate()
    @serialize()
    public override content: RelationshipAttribute;

    @validate()
    @serialize()
    public initialSharingInfo: Omit<OwnRelationshipAttributeSharingInfo, "deletionInfo">;

    public static from(value: IOwnRelationshipAttributeSuccessorParams | OwnRelationshipAttributeSuccessorParamsJSON): OwnRelationshipAttributeSuccessorParams {
        return this.fromAny(value);
    }
}
