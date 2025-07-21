import { serialize, validate } from "@js-soft/ts-serval";
import { CoreAddress, ICoreAddress } from "@nmshd/core-types";
import { AbstractAttributeSharingInfo, AbstractAttributeSharingInfoJSON, IAbstractAttributeSharingInfo } from "./AbstractAttributeSharingInfo";
import { IPeerAttributeDeletionInfo, PeerAttributeDeletionInfo, PeerAttributeDeletionInfoJSON } from "./deletionInfos";

export interface ThirdPartyRelationshipAttributeSharingInfoJSON extends AbstractAttributeSharingInfoJSON {
    initialAttributePeer: string;
    deletionInfo?: PeerAttributeDeletionInfoJSON;
}

export interface IThirdPartyRelationshipAttributeSharingInfo extends IAbstractAttributeSharingInfo {
    initialAttributePeer: ICoreAddress;
    deletionInfo?: IPeerAttributeDeletionInfo;
}

export class ThirdPartyRelationshipAttributeSharingInfo extends AbstractAttributeSharingInfo implements IThirdPartyRelationshipAttributeSharingInfo {
    @serialize()
    @validate()
    public initialAttributePeer: CoreAddress;

    @serialize()
    @validate({ nullable: true })
    public override deletionInfo?: PeerAttributeDeletionInfo;

    public static from(value: IThirdPartyRelationshipAttributeSharingInfo | ThirdPartyRelationshipAttributeSharingInfoJSON): ThirdPartyRelationshipAttributeSharingInfo {
        return super.fromAny(value) as ThirdPartyRelationshipAttributeSharingInfo;
    }
}
