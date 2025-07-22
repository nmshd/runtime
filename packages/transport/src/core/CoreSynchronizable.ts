import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";
import { CoreId, ICoreId } from "@nmshd/core-types";

export interface ICoreSynchronizable extends ISerializable {
    id: ICoreId;
}

export abstract class CoreSynchronizable extends Serializable implements ICoreSynchronizable {
    public readonly technicalProperties: string[] = [];
    public readonly contentProperties: string[] = [];
    public readonly userdataProperties: string[] = [];
    public readonly metadataProperties: string[] = [];

    @validate()
    @serialize()
    public id: CoreId;
}
