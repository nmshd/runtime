import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";
import { CoreAddress, CoreId, ICoreAddress, ICoreId } from "@nmshd/core-types";
import {
    ForwardedAttributeDeletionInfo,
    ForwardedAttributeDeletionInfoJSON,
    IForwardedAttributeDeletionInfo,
    IPeerAttributeDeletionInfo,
    IThirdPartyRelationshipAttributeDeletionInfo,
    PeerAttributeDeletionInfo,
    PeerAttributeDeletionInfoJSON,
    ThirdPartyRelationshipAttributeDeletionInfo,
    ThirdPartyRelationshipAttributeDeletionInfoJSON
} from "./deletionInfos";
export interface AbstractAttributeSharingInfoJSON {
    peer: string;
    sourceReference: string;
    deletionInfo?: ForwardedAttributeDeletionInfoJSON | PeerAttributeDeletionInfoJSON | ThirdPartyRelationshipAttributeDeletionInfoJSON;
}

export interface IAbstractAttributeSharingInfo extends ISerializable {
    peer: ICoreAddress;
    sourceReference: ICoreId;
    deletionInfo?: IForwardedAttributeDeletionInfo | IPeerAttributeDeletionInfo | IThirdPartyRelationshipAttributeDeletionInfo;
}

export abstract class AbstractAttributeSharingInfo extends Serializable implements IAbstractAttributeSharingInfo {
    @validate()
    @serialize()
    public peer: CoreAddress;

    @serialize()
    @validate()
    public sourceReference: CoreId;

    @serialize()
    @validate({ nullable: true })
    public deletionInfo?: ForwardedAttributeDeletionInfo | PeerAttributeDeletionInfo | ThirdPartyRelationshipAttributeDeletionInfo;
}
