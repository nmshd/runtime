import { serialize, validate } from "@js-soft/ts-serval";
import { CoreAddress, ICoreAddress } from "@nmshd/core-types";
import { AbstractAttributeSharingInfo, AbstractAttributeSharingInfoJSON, IAbstractAttributeSharingInfo } from "./AbstractAttributeSharingInfo";
import { IThirdPartyRelationshipAttributeDeletionInfo, ThirdPartyRelationshipAttributeDeletionInfo, ThirdPartyRelationshipAttributeDeletionInfoJSON } from "./deletionInfos";

export interface ThirdPartyRelationshipAttributeSharingInfoJSON extends AbstractAttributeSharingInfoJSON {
    initialAttributePeer: string;
    deletionInfo?: ThirdPartyRelationshipAttributeDeletionInfoJSON;
}

export interface IThirdPartyRelationshipAttributeSharingInfo extends IAbstractAttributeSharingInfo {
    initialAttributePeer: ICoreAddress;
    deletionInfo?: IThirdPartyRelationshipAttributeDeletionInfo;
}

export class ThirdPartyRelationshipAttributeSharingInfo extends AbstractAttributeSharingInfo implements IThirdPartyRelationshipAttributeSharingInfo {
    @serialize()
    @validate()
    public initialAttributePeer: CoreAddress;

    @serialize()
    @validate({ nullable: true })
    public override deletionInfo?: ThirdPartyRelationshipAttributeDeletionInfo;

    public static from(value: IThirdPartyRelationshipAttributeSharingInfo | ThirdPartyRelationshipAttributeSharingInfoJSON): ThirdPartyRelationshipAttributeSharingInfo {
        return super.fromAny(value) as ThirdPartyRelationshipAttributeSharingInfo;
    }
}
