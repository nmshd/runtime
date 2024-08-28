import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreAddress, CoreDate, CoreId, ICoreAddress, ICoreDate, ICoreId } from "@nmshd/core-types";

export interface ICachedToken extends ISerializable {
    createdBy: ICoreAddress;
    createdAt: ICoreDate;
    expiresAt: ICoreDate;
    content: ISerializable;
    createdByDevice: ICoreId;
}

@type("CachedToken")
export class CachedToken extends Serializable implements ICachedToken {
    @validate()
    @serialize()
    public createdBy: CoreAddress;

    @validate()
    @serialize()
    public createdAt: CoreDate;

    @validate()
    @serialize()
    public expiresAt: CoreDate;

    @validate()
    @serialize()
    public content: Serializable;

    @validate()
    @serialize()
    public createdByDevice: CoreId;

    public static from(value: ICachedToken): CachedToken {
        return this.fromAny(value);
    }
}
