import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";
import { CoreAddress, CoreDate, CoreId, ICoreAddress, ICoreDate, ICoreId } from "@nmshd/core-types";
import {
    ForwardedRelationshipAttributeDeletionInfo,
    ForwardedRelationshipAttributeDeletionInfoJSON,
    IForwardedRelationshipAttributeDeletionInfo
} from "./ForwardedRelationshipAttributeDeletionInfo";
import { IOwnAttributeDeletionInfo, OwnAttributeDeletionInfo, OwnAttributeDeletionInfoJSON } from "./OwnAttributeDeletionInfo";
import { IPeerAttributeDeletionInfo, PeerAttributeDeletionInfo, PeerAttributeDeletionInfoJSON } from "./PeerAttributeDeletionInfo";
import {
    IThirdPartyRelationshipAttributeDeletionInfo,
    ThirdPartyRelationshipAttributeDeletionInfo,
    ThirdPartyRelationshipAttributeDeletionInfoJSON
} from "./ThirdPartyRelationshipAttributeDeletionInfo";

export interface AbstractAttributeSharingInfoJSON {
    peer: string;
    sourceReference: string;
    sharedAt: string;
    deletionInfo?: OwnAttributeDeletionInfoJSON | PeerAttributeDeletionInfoJSON | ThirdPartyRelationshipAttributeDeletionInfoJSON | ForwardedRelationshipAttributeDeletionInfoJSON;
}

export interface IAbstractAttributeSharingInfo extends ISerializable {
    peer: ICoreAddress;
    sourceReference: ICoreId;
    sharedAt: ICoreDate;
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
    @validate()
    public sharedAt: CoreDate;

    @serialize()
    @validate({ nullable: true })
    public deletionInfo?: OwnAttributeDeletionInfo | PeerAttributeDeletionInfo | ThirdPartyRelationshipAttributeDeletionInfo | ForwardedRelationshipAttributeDeletionInfo;
}
