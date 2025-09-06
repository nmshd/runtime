import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { IRelationshipAttribute, RelationshipAttribute, RelationshipAttributeJSON } from "@nmshd/content";
import { CoreId, ICoreId } from "@nmshd/core-types";
import { IThirdPartyRelationshipAttributeSharingInfo, ThirdPartyRelationshipAttributeSharingInfo, ThirdPartyRelationshipAttributeSharingInfoJSON } from "../sharingInfos";

export interface ThirdPartyRelationshipAttributeSuccessorParamsJSON {
    content: RelationshipAttributeJSON;
    id: string;
    peerSharingInfo: Omit<ThirdPartyRelationshipAttributeSharingInfoJSON, "deletionInfo">;
}

export interface IThirdPartyRelationshipAttributeSuccessorParams extends ISerializable {
    content: IRelationshipAttribute;
    id: ICoreId;
    peerSharingInfo: Omit<IThirdPartyRelationshipAttributeSharingInfo, "deletionInfo">;
}

@type("ThirdPartyRelationshipAttributeSuccessorParams")
export class ThirdPartyRelationshipAttributeSuccessorParams extends Serializable implements IThirdPartyRelationshipAttributeSuccessorParams {
    @validate()
    @serialize()
    public content: RelationshipAttribute;

    @validate()
    @serialize()
    public id: CoreId;

    @validate({ nullable: true })
    @serialize()
    public peerSharingInfo: Omit<ThirdPartyRelationshipAttributeSharingInfo, "deletionInfo">;

    public static from(
        value: IThirdPartyRelationshipAttributeSuccessorParams | ThirdPartyRelationshipAttributeSuccessorParamsJSON
    ): ThirdPartyRelationshipAttributeSuccessorParams {
        return this.fromAny(value);
    }
}
