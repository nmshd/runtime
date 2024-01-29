import { Serializable, serialize, validate } from "@js-soft/ts-serval";
import { nameof } from "ts-simple-nameof";
import { CoreDate, CoreId, CoreSynchronizable, ICoreDate, ICoreSerializable } from "../../src";

export interface ICachedACacheableSynchronizedCollectionItem {
    someCacheProperty: string;
}

export interface IACacheableSynchronizedCollectionItem extends ICoreSerializable {
    id: CoreId;

    someTechnicalProperty?: string;

    cache?: ICachedACacheableSynchronizedCollectionItem;
    cachedAt?: ICoreDate;
}

export class CachedACacheableSynchronizedCollectionItem extends Serializable implements ICachedACacheableSynchronizedCollectionItem {
    @validate()
    @serialize()
    public someCacheProperty: string;
}

export class ACacheableSynchronizedCollectionItem extends CoreSynchronizable implements IACacheableSynchronizedCollectionItem {
    public override readonly technicalProperties = [nameof<ACacheableSynchronizedCollectionItem>((r) => r.someTechnicalProperty)];

    @validate({ nullable: true })
    @serialize()
    public cache?: CachedACacheableSynchronizedCollectionItem;

    @validate({ nullable: true })
    @serialize()
    public cachedAt?: CoreDate;

    @serialize()
    @validate({ nullable: true })
    public someTechnicalProperty?: string;

    public static from(value: IACacheableSynchronizedCollectionItem): ACacheableSynchronizedCollectionItem {
        return this.fromAny(value);
    }
}
