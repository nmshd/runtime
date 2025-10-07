import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";
import { IdentityAttribute, IdentityAttributeJSON, IIdentityAttribute } from "@nmshd/content";
import { CoreAddress, CoreId, ICoreAddress, ICoreId } from "@nmshd/core-types";

export interface CreateSharedLocalAttributeCopyParamsJSON {
    attributeId?: string;
    sourceAttributeId: string;
    newAttribute?: IdentityAttributeJSON;
    peer: string;
    requestReference: string;
}

export interface ICreateSharedLocalAttributeCopyParams extends ISerializable {
    attributeId?: ICoreId;
    sourceAttributeId: ICoreId;
    newAttribute?: IIdentityAttribute;
    peer: ICoreAddress;
    requestReference: ICoreId;
}

export class CreateSharedLocalAttributeCopyParams extends Serializable implements ICreateSharedLocalAttributeCopyParams {
    @serialize()
    @validate({ nullable: true })
    public attributeId?: CoreId;

    @serialize()
    @validate()
    public sourceAttributeId: CoreId;

    @serialize()
    @validate({ nullable: true })
    public newAttribute?: IdentityAttribute;

    @serialize()
    @validate()
    public peer: CoreAddress;

    @serialize()
    @validate()
    public requestReference: CoreId;

    public static from(value: ICreateSharedLocalAttributeCopyParams | CreateSharedLocalAttributeCopyParamsJSON): CreateSharedLocalAttributeCopyParams {
        return this.fromAny(value);
    }
}
