import { serialize, type, validate } from "@js-soft/ts-serval";
import { IRelationshipAttribute, RelationshipAttribute, RelationshipAttributeJSON } from "@nmshd/content";
import { CoreId, ICoreId } from "@nmshd/core-types";
import {
    IThirdPartyRelationshipAttributeSharingInfo,
    ThirdPartyRelationshipAttributeSharingInfo,
    ThirdPartyRelationshipAttributeSharingInfoJSON
} from "../ThirdPartyRelationshipAttributeSharingInfo";
import { AbstractAttributeSuccessorParams, AbstractAttributeSuccessorParamsJSON, IAbstractAttributeSuccessorParams } from "./AbstractAttributeSuccessorParams";

export interface ThirdPartyRelationshipAttributeSuccessorParamsJSON extends AbstractAttributeSuccessorParamsJSON {
    content: RelationshipAttributeJSON;
    id: string;
    sharingInfo: Omit<ThirdPartyRelationshipAttributeSharingInfoJSON, "deletionInfo">;
}

export interface IThirdPartyRelationshipAttributeSuccessorParams extends IAbstractAttributeSuccessorParams {
    content: IRelationshipAttribute;
    id: ICoreId;
    sharingInfo: Omit<IThirdPartyRelationshipAttributeSharingInfo, "deletionInfo">;
}

@type("ThirdPartyRelationshipAttributeSuccessorParams")
export class ThirdPartyRelationshipAttributeSuccessorParams extends AbstractAttributeSuccessorParams implements IThirdPartyRelationshipAttributeSuccessorParams {
    @validate()
    @serialize()
    public override content: RelationshipAttribute;

    @validate()
    @serialize()
    public override id: CoreId;

    @validate({ nullable: true })
    @serialize()
    public sharingInfo: Omit<ThirdPartyRelationshipAttributeSharingInfo, "deletionInfo">;

    public static from(
        value: IThirdPartyRelationshipAttributeSuccessorParams | ThirdPartyRelationshipAttributeSuccessorParamsJSON
    ): ThirdPartyRelationshipAttributeSuccessorParams {
        return this.fromAny(value);
    }
}
