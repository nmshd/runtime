import { serialize, validate } from "@js-soft/ts-serval";
import { CoreAddress, CoreDate, CoreSerializable, ICoreAddress, ICoreDate, ICoreSerializable } from "@nmshd/transport";
import { ContentJSON } from "../ContentJSON";

export interface AbstractAttributeJSON extends ContentJSON {
    owner: string;
    validFrom?: string;
    validTo?: string;
}

export interface IAbstractAttribute extends ICoreSerializable {
    owner: ICoreAddress;
    validFrom?: ICoreDate;
    validTo?: ICoreDate;
}

export abstract class AbstractAttribute extends CoreSerializable implements IAbstractAttribute {
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
