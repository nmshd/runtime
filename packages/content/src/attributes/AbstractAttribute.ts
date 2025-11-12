import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";
import { CoreAddress, ICoreAddress } from "@nmshd/core-types";
import { ContentJSON } from "../ContentJSON.js";

export interface AbstractAttributeJSON extends ContentJSON {
    owner: string;
}

export interface IAbstractAttribute extends ISerializable {
    owner: ICoreAddress;
}

export abstract class AbstractAttribute extends Serializable implements IAbstractAttribute {
    @validate()
    @serialize()
    public owner: CoreAddress;
}
