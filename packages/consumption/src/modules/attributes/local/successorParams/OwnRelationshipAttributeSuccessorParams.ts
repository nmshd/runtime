import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { RelationshipAttribute, RelationshipAttributeJSON } from "@nmshd/content";
import { IOwnRelationshipAttributeSharingInfo, OwnRelationshipAttributeSharingInfo, OwnRelationshipAttributeSharingInfoJSON } from "../sharingInfos";

export interface OwnRelationshipAttributeSuccessorParamsJSON {
    content: RelationshipAttributeJSON;
    peerSharingInfo: Omit<OwnRelationshipAttributeSharingInfoJSON, "deletionInfo">;
}

export interface IOwnRelationshipAttributeSuccessorParams extends ISerializable {
    content: RelationshipAttribute;
    peerSharingInfo: Omit<IOwnRelationshipAttributeSharingInfo, "deletionInfo">;
}

@type("OwnRelationshipAttributeSuccessorParams")
export class OwnRelationshipAttributeSuccessorParams extends Serializable implements IOwnRelationshipAttributeSuccessorParams {
    @validate()
    @serialize()
    public content: RelationshipAttribute;

    @validate()
    @serialize()
    public peerSharingInfo: Omit<OwnRelationshipAttributeSharingInfo, "deletionInfo">;

    public static from(value: IOwnRelationshipAttributeSuccessorParams | OwnRelationshipAttributeSuccessorParamsJSON): OwnRelationshipAttributeSuccessorParams {
        return this.fromAny(value);
    }
}
