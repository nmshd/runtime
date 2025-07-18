import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { IRelationshipAttribute, RelationshipAttribute, RelationshipAttributeJSON } from "@nmshd/content";
import { CoreId, ICoreId } from "@nmshd/core-types";
import {
    IThirdPartyRelationshipAttributeSharingInfo,
    ThirdPartyRelationshipAttributeSharingInfo,
    ThirdPartyRelationshipAttributeSharingInfoJSON
} from "./ThirdPartyRelationshipAttributeSharingInfo";

export interface ThirdPartyRelationshipAttributeSuccessorParamsJSON {
    content: RelationshipAttributeJSON;
    sharingInfo: ThirdPartyRelationshipAttributeSharingInfoJSON; // TODO: omit deletionInfo?
    id?: string; // TODO: mandatory?
}

export interface IThirdPartyRelationshipAttributeSuccessorParams extends ISerializable {
    content: IRelationshipAttribute;
    sharingInfo: IThirdPartyRelationshipAttributeSharingInfo;
    id?: ICoreId;
}

@type("ThirdPartyRelationshipAttributeSuccessorParams")
export class ThirdPartyRelationshipAttributeSuccessorParams extends Serializable implements IThirdPartyRelationshipAttributeSuccessorParams {
    @validate()
    @serialize()
    public content: RelationshipAttribute;

    @validate({ nullable: true })
    @serialize()
    public sharingInfo: ThirdPartyRelationshipAttributeSharingInfo;

    @validate({ nullable: true })
    @serialize()
    public id?: CoreId;

    public static from(
        value: IThirdPartyRelationshipAttributeSuccessorParams | ThirdPartyRelationshipAttributeSuccessorParamsJSON
    ): ThirdPartyRelationshipAttributeSuccessorParams {
        return this.fromAny(value);
    }
}
