import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";
import { CoreAddress, CoreId, ICoreAddress, ICoreId } from "@nmshd/core-types";

export interface CreateSharedLocalAttributeCopyParamsJSON {
    attributeId?: string;
    sourceAttributeId: string;
    peer: string;
    requestReference: string;
    thirdPartyAddress?: string;
}

export interface ICreateSharedLocalAttributeCopyParams extends ISerializable {
    attributeId?: ICoreId;
    sourceAttributeId: ICoreId;
    peer: ICoreAddress;
    requestReference: ICoreId;
    thirdPartyAddress?: ICoreAddress;
}

export class CreateSharedLocalAttributeCopyParams extends Serializable implements ICreateSharedLocalAttributeCopyParams {
    @serialize()
    @validate({ nullable: true })
    public attributeId?: CoreId;

    @serialize()
    @validate()
    public sourceAttributeId: CoreId;

    @serialize()
    @validate()
    public peer: CoreAddress;

    @serialize()
    @validate()
    public requestReference: CoreId;

    @serialize()
    @validate({ nullable: true })
    public thirdPartyAddress: CoreAddress;

    public static from(value: ICreateSharedLocalAttributeCopyParams | CreateSharedLocalAttributeCopyParamsJSON): CreateSharedLocalAttributeCopyParams {
        return this.fromAny(value);
    }
}
