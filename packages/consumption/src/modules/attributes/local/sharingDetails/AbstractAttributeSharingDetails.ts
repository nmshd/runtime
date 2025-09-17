import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";
import { CoreAddress, CoreId, ICoreAddress, ICoreId } from "@nmshd/core-types";
import {
    EmittedAttributeDeletionInfo,
    EmittedAttributeDeletionInfoJSON,
    IEmittedAttributeDeletionInfo,
    IReceivedAttributeDeletionInfo,
    IThirdPartyRelationshipAttributeDeletionInfo,
    ReceivedAttributeDeletionInfo,
    ReceivedAttributeDeletionInfoJSON,
    ThirdPartyRelationshipAttributeDeletionInfo,
    ThirdPartyRelationshipAttributeDeletionInfoJSON
} from "./deletionInfos";

export interface AbstractAttributeSharingDetailsJSON {
    peer: string;
    sourceReference: string;
    deletionInfo?: EmittedAttributeDeletionInfoJSON | ReceivedAttributeDeletionInfoJSON | ThirdPartyRelationshipAttributeDeletionInfoJSON;
}

export interface IAbstractAttributeSharingDetails extends ISerializable {
    peer: ICoreAddress;
    sourceReference: ICoreId;
    deletionInfo?: IEmittedAttributeDeletionInfo | IReceivedAttributeDeletionInfo | IThirdPartyRelationshipAttributeDeletionInfo;
}

export abstract class AbstractAttributeSharingDetails extends Serializable implements IAbstractAttributeSharingDetails {
    @validate()
    @serialize()
    public peer: CoreAddress;

    @serialize()
    @validate()
    public sourceReference: CoreId;

    @serialize()
    @validate({ nullable: true })
    public deletionInfo?: EmittedAttributeDeletionInfo | ReceivedAttributeDeletionInfo | ThirdPartyRelationshipAttributeDeletionInfo;
}
