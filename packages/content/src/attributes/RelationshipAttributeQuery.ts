import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreAddress, ICoreAddress } from "@nmshd/core-types";
import { AbstractAttributeQuery, AbstractAttributeQueryJSON, IAbstractAttributeQuery } from "./AbstractAttributeQuery";
import { AttributeValues } from "./AttributeValueTypes";
import { characterSets } from "./constants/CharacterSets";
import { IValueHints, ValueHints, ValueHintsJSON } from "./hints";
import { RelationshipAttributeConfidentiality } from "./RelationshipAttributeConfidentiality";
import { PROPRIETARY_ATTRIBUTE_MAX_DESCRIPTION_LENGTH, PROPRIETARY_ATTRIBUTE_MAX_TITLE_LENGTH } from "./types/proprietary/ProprietaryAttributeValue";

export interface RelationshipAttributeCreationHintsJSON {
    title: string;
    valueType: AttributeValues.Relationship.TypeName;
    description?: string;
    valueHints?: ValueHintsJSON;
    confidentiality: RelationshipAttributeConfidentiality;
}

export interface IRelationshipAttributeCreationHints extends ISerializable {
    title: string;
    valueType: AttributeValues.Relationship.TypeName;
    description?: string;
    valueHints?: IValueHints;
    confidentiality: RelationshipAttributeConfidentiality;
}

/**
 * AttributeHints are rendering hints with a `title` and a possible `description` set.
 * They are primarily used within `RelationshipAttributeQuery` to define the metadata of
 * a proprietary Attribute, even without such an Attribute existent.
 */
@type("RelationshipAttributeCreationHints")
export class RelationshipAttributeCreationHints extends Serializable implements IRelationshipAttributeCreationHints {
    @serialize()
    @validate({ max: PROPRIETARY_ATTRIBUTE_MAX_TITLE_LENGTH, regExp: characterSets.din91379DatatypeC })
    public title: string;

    @serialize()
    @validate({
        customValidator: (v) => (!AttributeValues.Relationship.TYPE_NAMES.includes(v) ? `must be one of: ${AttributeValues.Relationship.TYPE_NAMES_STRINGIFIED}` : undefined)
    })
    public valueType: AttributeValues.Relationship.TypeName;

    @serialize()
    @validate({ nullable: true, max: PROPRIETARY_ATTRIBUTE_MAX_DESCRIPTION_LENGTH, regExp: characterSets.din91379DatatypeC })
    public description?: string;

    @serialize()
    @validate({ nullable: true })
    public valueHints?: ValueHints;

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

    public static from(value: IRelationshipAttributeCreationHints | Omit<RelationshipAttributeCreationHintsJSON, "@type">): RelationshipAttributeCreationHints {
        return this.fromAny(value);
    }
}

export interface RelationshipAttributeQueryJSON extends AbstractAttributeQueryJSON {
    "@type": "RelationshipAttributeQuery";
    key: string;
    owner: string;
    attributeCreationHints: RelationshipAttributeCreationHintsJSON;
}

export interface IRelationshipAttributeQuery extends IAbstractAttributeQuery {
    key: string;
    owner: ICoreAddress;
    attributeCreationHints: IRelationshipAttributeCreationHints;
}

@type("RelationshipAttributeQuery")
export class RelationshipAttributeQuery extends AbstractAttributeQuery implements IRelationshipAttributeQuery {
    @serialize()
    @validate({ max: 100, regExp: characterSets.din91379DatatypeC })
    public key: string;

    @serialize()
    @validate()
    public owner: CoreAddress;

    @serialize()
    @validate()
    public attributeCreationHints: RelationshipAttributeCreationHints;

    public static from(value: IRelationshipAttributeQuery | Omit<RelationshipAttributeQueryJSON, "@type">): RelationshipAttributeQuery {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): RelationshipAttributeQueryJSON {
        return super.toJSON(verbose, serializeAsString) as RelationshipAttributeQueryJSON;
    }
}
