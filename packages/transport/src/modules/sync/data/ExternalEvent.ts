import { Serializable, serialize, validate } from "@js-soft/ts-serval";

export class ExternalEvent extends Serializable {
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
}
