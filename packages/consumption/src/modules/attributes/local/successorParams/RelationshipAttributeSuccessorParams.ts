import { serialize, type, validate } from "@js-soft/ts-serval";
import { RelationshipAttribute, RelationshipAttributeJSON } from "@nmshd/content";
import { CoreId, ICoreId } from "@nmshd/core-types";
import { IOwnRelationshipAttributeSharingInfo, OwnRelationshipAttributeSharingInfo, OwnRelationshipAttributeSharingInfoJSON } from "../OwnRelationshipAttributeSharingInfo";
import { IPeerRelationshipAttributeSharingInfo, PeerRelationshipAttributeSharingInfo, PeerRelationshipAttributeSharingInfoJSON } from "../PeerRelationshipAttributeSharingInfo";
import { AbstractAttributeSuccessorParams, AbstractAttributeSuccessorParamsJSON, IAbstractAttributeSuccessorParams } from "./AbstractIdentityAttributeSuccessorParams";

// TODO: maybe split this into separate files for own and peer
export interface RelationshipAttributeSuccessorParamsJSON extends AbstractAttributeSuccessorParamsJSON {
    content: RelationshipAttributeJSON;
    id?: string; // TODO: mandatory for PeerRelationshipAttribute? -> no, CreateAttributeRequestItem <- not sure what I thought there
    initialSharingInfo: Omit<OwnRelationshipAttributeSharingInfoJSON, "deletionInfo"> | Omit<PeerRelationshipAttributeSharingInfoJSON, "deletionInfo">;
}

export interface IRelationshipAttributeSuccessorParams extends IAbstractAttributeSuccessorParams {
    content: RelationshipAttribute;
    id?: ICoreId;
    initialSharingInfo: Omit<IOwnRelationshipAttributeSharingInfo, "deletionInfo"> | Omit<IPeerRelationshipAttributeSharingInfo, "deletionInfo">;
}

@type("RelationshipAttributeSuccessorParams")
export class RelationshipAttributeSuccessorParams extends AbstractAttributeSuccessorParams implements IRelationshipAttributeSuccessorParams {
    @validate()
    @serialize()
    public override content: RelationshipAttribute;

    @validate({ nullable: true })
    @serialize()
    public override id?: CoreId;

    @validate()
    @serialize()
    public initialSharingInfo: Omit<OwnRelationshipAttributeSharingInfo, "deletionInfo"> | Omit<PeerRelationshipAttributeSharingInfo, "deletionInfo">;

    public static from(value: IRelationshipAttributeSuccessorParams | RelationshipAttributeSuccessorParamsJSON): RelationshipAttributeSuccessorParams {
        return this.fromAny(value);
    }
}
