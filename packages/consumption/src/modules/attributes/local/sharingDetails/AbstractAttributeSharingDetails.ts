import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";
import { CoreAddress, CoreId, ICoreAddress, ICoreId } from "@nmshd/core-types";
import { AbstractAttributeDeletionInfo, EmittedAttributeDeletionInfoJSON, IAbstractAttributeDeletionInfo, ReceivedAttributeDeletionInfoJSON } from "./deletionInfos";

export interface AbstractAttributeSharingDetailsJSON {
    peer: string;
    sourceReference: string;
    deletionInfo?: EmittedAttributeDeletionInfoJSON | ReceivedAttributeDeletionInfoJSON | ReceivedAttributeDeletionInfoJSON;
}

export interface IAbstractAttributeSharingDetails extends ISerializable {
    peer: ICoreAddress;
    sourceReference: ICoreId;
    deletionInfo?: IAbstractAttributeDeletionInfo;
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
    public deletionInfo?: AbstractAttributeDeletionInfo;
}
