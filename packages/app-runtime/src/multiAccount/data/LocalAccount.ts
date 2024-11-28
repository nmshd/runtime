import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreAddress, CoreDate, CoreId, ICoreAddress, ICoreDate, ICoreId } from "@nmshd/core-types";

export interface ILocalAccount extends ISerializable {
    id: ICoreId;
    address?: ICoreAddress;
    name: string;
    directory: string;
    order: number;
    lastAccessedAt?: ICoreDate;
    devicePushIdentifier?: string;
    deletionDate?: ICoreDate;
}

@type("LocalAccount")
export class LocalAccount extends Serializable implements ILocalAccount {
    @validate()
    @serialize()
    public id: CoreId;

    @validate({ nullable: true })
    @serialize()
    public address?: CoreAddress;

    @validate()
    @serialize()
    public name: string;

    @validate()
    @serialize()
    public directory: string;

    @validate()
    @serialize()
    public order: number;

    @validate({ nullable: true })
    @serialize()
    public lastAccessedAt?: CoreDate;

    @validate({ nullable: true })
    @serialize()
    public devicePushIdentifier?: string;

    @validate({ nullable: true })
    @serialize()
    public deletionDate?: CoreDate;

    public static from(value: ILocalAccount): LocalAccount {
        return this.fromAny(value);
    }
}
