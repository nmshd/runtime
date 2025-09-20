import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreAddress, ICoreAddress } from "@nmshd/core-types";
import { AbstractAttributeSharingDetails, AbstractAttributeSharingDetailsJSON, IAbstractAttributeSharingDetails } from "./AbstractAttributeSharingDetails";
import { IThirdPartyRelationshipAttributeDeletionInfo, ThirdPartyRelationshipAttributeDeletionInfo, ThirdPartyRelationshipAttributeDeletionInfoJSON } from "./deletionInfos";

export interface ThirdPartyRelationshipAttributeSharingDetailsJSON extends AbstractAttributeSharingDetailsJSON {
    initialAttributePeer: string;
    deletionInfo?: ThirdPartyRelationshipAttributeDeletionInfoJSON;
}

export interface IThirdPartyRelationshipAttributeSharingDetails extends IAbstractAttributeSharingDetails {
    initialAttributePeer: ICoreAddress;
    deletionInfo?: IThirdPartyRelationshipAttributeDeletionInfo;
}

@type("ThirdPartyRelationshipAttributeSharingDetails")
export class ThirdPartyRelationshipAttributeSharingDetails extends AbstractAttributeSharingDetails implements IThirdPartyRelationshipAttributeSharingDetails {
    @serialize()
    @validate()
    public initialAttributePeer: CoreAddress;

    @serialize()
    @validate({ nullable: true })
    public override deletionInfo?: ThirdPartyRelationshipAttributeDeletionInfo;

    public static from(value: IThirdPartyRelationshipAttributeSharingDetails | ThirdPartyRelationshipAttributeSharingDetailsJSON): ThirdPartyRelationshipAttributeSharingDetails {
        return super.fromAny(value) as ThirdPartyRelationshipAttributeSharingDetails;
    }
}
