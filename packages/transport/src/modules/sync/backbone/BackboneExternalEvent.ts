import { serialize, validate } from "@js-soft/ts-serval";
import { CoreSerializable, ICoreSerializable } from "../../../core";

export interface IBackboneExternalEvent extends ICoreSerializable {
    id: string;
    type: string;
    index: number;
    createdAt: string;
    syncErrorCount: number;
    payload: object;
}

export class BackboneExternalEvent extends CoreSerializable implements IBackboneExternalEvent {
    @serialize()
    @validate()
    public id: string;
    @serialize()
    @validate()
    public type: string;
    @serialize()
    @validate()
    public index: number;
    @serialize()
    @validate()
    public createdAt: string;
    @serialize()
    @validate()
    public syncErrorCount: number;
    @serialize()
    @validate()
    public payload: object;
    public static from(value: IBackboneExternalEvent): BackboneExternalEvent {
        return this.fromAny(value);
    }
}
