import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";
import { IRelationshipAttribute, RelationshipAttribute } from "@nmshd/content";
import { CoreAddress, CoreId, ICoreAddress, ICoreId } from "@nmshd/transport";

export interface ICreateAttributeParams extends ISerializable {
    content: IRelationshipAttribute;
    peer: ICoreAddress;
    requestReference: ICoreId;
}

export class CreateAttributeParams extends Serializable implements ICreateAttributeParams {
    @serialize()
    @validate()
    public content: RelationshipAttribute;

    @serialize()
    @validate()
    public peer: CoreAddress;

    @serialize()
    @validate()
    public requestReference: CoreId;

    public static from(value: ICreateAttributeParams): CreateAttributeParams {
        return this.fromAny(value);
    }
}
