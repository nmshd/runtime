import { serialize, type, validate } from "@js-soft/ts-serval";
import { AbstractAttribute, AbstractAttributeJSON, IAbstractAttribute } from "./AbstractAttribute.js";
import { AttributeValues } from "./AttributeValueTypes.js";
import { RelationshipAttributeConfidentiality } from "./RelationshipAttributeConfidentiality.js";

export interface RelationshipAttributeJSON<TValueJSONInterface extends AttributeValues.Relationship.Json = AttributeValues.Relationship.Json> extends AbstractAttributeJSON {
    "@type": "RelationshipAttribute";
    value: TValueJSONInterface;
    key: string;
    isTechnical?: boolean;
    confidentiality: RelationshipAttributeConfidentiality;
}

export interface IRelationshipAttribute<TValueInterface extends AttributeValues.Relationship.Interface = AttributeValues.Relationship.Interface> extends IAbstractAttribute {
    value: TValueInterface;
    key: string;
    isTechnical?: boolean;
    confidentiality: RelationshipAttributeConfidentiality;
}

@type("RelationshipAttribute")
export class RelationshipAttribute<TValueClass extends AttributeValues.Relationship.Class = AttributeValues.Relationship.Class>
    extends AbstractAttribute
    implements IRelationshipAttribute<TValueClass>
{
    @serialize({ unionTypes: AttributeValues.Relationship.CLASSES })
    @validate()
    public value: TValueClass;

    @serialize()
    @validate({ max: 100 })
    public key: string;

    @serialize()
    @validate({ nullable: true })
    public isTechnical: boolean;

    @serialize()
    @validate({
        customValidator: (v) =>
            !Object.values(RelationshipAttributeConfidentiality).includes(v) ? `must be one of: ${Object.values(RelationshipAttributeConfidentiality)}` : undefined
    })
    public confidentiality: RelationshipAttributeConfidentiality;

    protected static override preFrom(value: any): any {
        if (value.isTechnical === undefined) value.isTechnical = false;

        return value;
    }

    public static from<
        TValueClass extends AttributeValues.Relationship.Class = AttributeValues.Relationship.Class,
        TValueInterface extends AttributeValues.Relationship.Interface = AttributeValues.Relationship.Interface,
        TValueJSONInterface extends AttributeValues.Relationship.Json = AttributeValues.Relationship.Json
    >(value: IRelationshipAttribute<TValueInterface> | RelationshipAttributeJSON<TValueJSONInterface>): RelationshipAttribute<TValueClass> {
        return this.fromAny(value) as RelationshipAttribute<TValueClass>;
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): RelationshipAttributeJSON {
        return super.toJSON(verbose, serializeAsString) as RelationshipAttributeJSON;
    }
}
