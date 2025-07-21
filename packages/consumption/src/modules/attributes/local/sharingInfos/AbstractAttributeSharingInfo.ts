import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";
import { CoreAddress, CoreId, ICoreAddress, ICoreId } from "@nmshd/core-types";
import {
    ForwardedRelationshipAttributeDeletionInfo,
    ForwardedRelationshipAttributeDeletionInfoJSON,
    IForwardedRelationshipAttributeDeletionInfo,
    IOwnAttributeDeletionInfo,
    IPeerAttributeDeletionInfo,
    IThirdPartyRelationshipAttributeDeletionInfo,
    OwnAttributeDeletionInfo,
    OwnAttributeDeletionInfoJSON,
    PeerAttributeDeletionInfo,
    PeerAttributeDeletionInfoJSON,
    ThirdPartyRelationshipAttributeDeletionInfo,
    ThirdPartyRelationshipAttributeDeletionInfoJSON
} from "./deletionInfos";
export interface AbstractAttributeSharingInfoJSON {
    peer: string;
    sourceReference: string;
    deletionInfo?: OwnAttributeDeletionInfoJSON | PeerAttributeDeletionInfoJSON | ThirdPartyRelationshipAttributeDeletionInfoJSON | ForwardedRelationshipAttributeDeletionInfoJSON;
}

export interface IAbstractAttributeSharingInfo extends ISerializable {
    peer: ICoreAddress;
    sourceReference: ICoreId;
    deletionInfo?: IOwnAttributeDeletionInfo | IPeerAttributeDeletionInfo | IThirdPartyRelationshipAttributeDeletionInfo | IForwardedRelationshipAttributeDeletionInfo;
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
    public deletionInfo?: OwnAttributeDeletionInfo | PeerAttributeDeletionInfo | ThirdPartyRelationshipAttributeDeletionInfo | ForwardedRelationshipAttributeDeletionInfo;
}
