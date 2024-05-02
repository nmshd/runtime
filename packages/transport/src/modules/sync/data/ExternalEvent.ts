import { Serializable, serialize, validate } from "@js-soft/ts-serval";
import { BackboneExternalEvent } from "../backbone/BackboneExternalEvent";

export class ExternalEvent extends Serializable implements BackboneExternalEvent {
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
    public static from(value: BackboneExternalEvent): ExternalEvent {
        return this.fromAny(value);
    }
}
