import { serialize, validate } from "@js-soft/ts-serval";
import { CoreSerializable, ICoreSerializable } from "./CoreSerializable";
import { CoreId, ICoreId } from "./types/CoreId";

export interface ICoreSynchronizable extends ICoreSerializable {
    id: ICoreId;
}

export abstract class CoreSynchronizable extends CoreSerializable implements ICoreSynchronizable {
    public readonly technicalProperties: string[] = [];
    public readonly userdataProperties: string[] = [];
    public readonly metadataProperties: string[] = [];

    @validate()
    @serialize()
    public id: CoreId;
}
