import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";
import { ContentJSON } from "../ContentJSON";

export interface AbstractAttributeQueryJSON extends ContentJSON {
    isVerified?: true;
}
export interface IAbstractAttributeQuery extends ISerializable {
    isVerified?: true;
}
export abstract class AbstractAttributeQuery extends Serializable implements IAbstractAttributeQuery {
    @serialize()
    @validate({ nullable: true })
    public isVerified?: true;
}
