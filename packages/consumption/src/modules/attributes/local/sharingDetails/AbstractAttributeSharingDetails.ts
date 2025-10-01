import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";
import { CoreAddress, CoreId, ICoreAddress, ICoreId } from "@nmshd/core-types";
import { AbstractAttributeDeletionInfo, IAbstractAttributeDeletionInfo } from "./deletionInfos";

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
