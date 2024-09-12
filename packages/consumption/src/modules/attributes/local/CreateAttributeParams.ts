import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { IRelationshipAttribute, RelationshipAttribute } from "@nmshd/content";
import { CoreAddress, CoreId, ICoreAddress, ICoreId } from "@nmshd/core-types";

export interface ICreateAttributeParams extends ISerializable {
    content: IRelationshipAttribute;
    peer: ICoreAddress;
    requestReference: ICoreId;
}

@type("CreateAttributeParams")
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
