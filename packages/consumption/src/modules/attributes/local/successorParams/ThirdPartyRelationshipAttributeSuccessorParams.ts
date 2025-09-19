import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { IRelationshipAttribute, RelationshipAttribute, RelationshipAttributeJSON } from "@nmshd/content";
import { CoreId, ICoreId } from "@nmshd/core-types";

export interface ThirdPartyRelationshipAttributeSuccessorParamsJSON {
    content: RelationshipAttributeJSON;
    id: string;
    sourceReference: string;
}

export interface IThirdPartyRelationshipAttributeSuccessorParams extends ISerializable {
    content: IRelationshipAttribute;
    id: ICoreId;
    sourceReference: ICoreId;
}

@type("ThirdPartyRelationshipAttributeSuccessorParams")
export class ThirdPartyRelationshipAttributeSuccessorParams extends Serializable implements IThirdPartyRelationshipAttributeSuccessorParams {
    @validate()
    @serialize()
    public content: RelationshipAttribute;

    @validate()
    @serialize()
    public id: CoreId;

    @validate({ nullable: true })
    @serialize()
    public sourceReference: CoreId;

    public static from(
        value: IThirdPartyRelationshipAttributeSuccessorParams | ThirdPartyRelationshipAttributeSuccessorParamsJSON
    ): ThirdPartyRelationshipAttributeSuccessorParams {
        return this.fromAny(value);
    }
}
