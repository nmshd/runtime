import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { RelationshipAttribute, RelationshipAttributeJSON } from "@nmshd/content";
import { CoreId, ICoreId } from "@nmshd/core-types";
import { IOwnRelationshipAttributeSharingInfo, OwnRelationshipAttributeSharingInfo, OwnRelationshipAttributeSharingInfoJSON } from "./OwnRelationshipAttributeSharingInfo";
import { IPeerRelationshipAttributeSharingInfo, PeerRelationshipAttributeSharingInfo, PeerRelationshipAttributeSharingInfoJSON } from "./PeerRelationshipAttributeSharingInfo";

export interface RelationshipAttributeSuccessorParamsJSON {
    content: RelationshipAttributeJSON;
    initialSharingInfo: Omit<OwnRelationshipAttributeSharingInfoJSON, "deletionInfo"> | Omit<PeerRelationshipAttributeSharingInfoJSON, "deletionInfo">;
    id?: string; // TODO: mandatory for PeerRelationshipAttribute? -> no, CreateAttributeRequestItem
}

export interface IRelationshipAttributeSuccessorParams extends ISerializable {
    content: RelationshipAttribute;
    initialSharingInfo: Omit<IOwnRelationshipAttributeSharingInfo, "deletionInfo"> | Omit<IPeerRelationshipAttributeSharingInfo, "deletionInfo">;
    id?: ICoreId;
}

@type("RelationshipAttributeSuccessorParams")
export class RelationshipAttributeSuccessorParams extends Serializable implements IRelationshipAttributeSuccessorParams {
    @validate()
    @serialize()
    public content: RelationshipAttribute;

    @validate()
    @serialize()
    public initialSharingInfo: Omit<OwnRelationshipAttributeSharingInfo, "deletionInfo"> | Omit<PeerRelationshipAttributeSharingInfo, "deletionInfo">;

    @validate({ nullable: true })
    @serialize()
    public id?: CoreId;

    public static from(value: IRelationshipAttributeSuccessorParams | RelationshipAttributeSuccessorParamsJSON): RelationshipAttributeSuccessorParams {
        return this.fromAny(value);
    }
}
