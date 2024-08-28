import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";
import { CoreAddress, CoreDate, ICoreAddress, ICoreDate } from "@nmshd/core-types";
import { ContentJSON } from "../ContentJSON";

export interface AbstractAttributeJSON extends ContentJSON {
    owner: string;
    validFrom?: string;
    validTo?: string;
}

export interface IAbstractAttribute extends ISerializable {
    owner: ICoreAddress;
    validFrom?: ICoreDate;
    validTo?: ICoreDate;
}

export abstract class AbstractAttribute extends Serializable implements IAbstractAttribute {
    @validate()
    @serialize()
    public owner: CoreAddress;

    @serialize()
    @validate({ nullable: true })
    public validFrom?: CoreDate;

    @serialize()
    @validate({ nullable: true })
    public validTo?: CoreDate;
}
