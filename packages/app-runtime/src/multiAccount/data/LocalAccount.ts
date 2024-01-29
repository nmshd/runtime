import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreAddress, CoreDate, CoreId, CoreSerializable, ICoreDate, ICoreSerializable, Realm } from "@nmshd/transport";

export interface ILocalAccount extends ICoreSerializable {
    id: CoreId;
    address?: CoreAddress;
    name: string;
    realm: Realm;
    directory: string;
    order: number;
    lastAccessedAt?: ICoreDate;
}

@type("LocalAccount")
export class LocalAccount extends CoreSerializable implements ILocalAccount {
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
    public realm: Realm;

    @validate()
    @serialize()
    public directory: string;

    @validate()
    @serialize()
    public order: number;

    @validate({ nullable: true })
    @serialize()
    public lastAccessedAt?: CoreDate;

    public static from(value: ILocalAccount): LocalAccount {
        return this.fromAny(value);
    }
}
