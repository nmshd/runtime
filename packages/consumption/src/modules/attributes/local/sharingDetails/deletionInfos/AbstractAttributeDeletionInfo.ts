import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";
import { CoreDate, ICoreDate } from "@nmshd/core-types";

export interface AbstractAttributeDeletionInfoJSON {
    deletionStatus: string;
    deletionDate: string;
}

export interface IAbstractAttributeDeletionInfo extends ISerializable {
    deletionStatus: string;
    deletionDate: ICoreDate;
}

export abstract class AbstractAttributeDeletionInfo extends Serializable implements IAbstractAttributeDeletionInfo {
    @serialize()
    @validate()
    public deletionStatus: string;

    @serialize()
    @validate()
    public deletionDate: CoreDate;
}
