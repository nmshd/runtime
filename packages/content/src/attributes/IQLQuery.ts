import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import * as iql from "@nmshd/iql";
import { AbstractAttributeQuery, AbstractAttributeQueryJSON, IAbstractAttributeQuery } from "./AbstractAttributeQuery";
import { AttributeValues } from "./AttributeValueTypes";
import { IdentityAttribute } from "./IdentityAttribute";

export interface IQLQueryCreationHintsJSON {
    valueType: AttributeValues.Identity.TypeName;
    tags?: string[];
}

export interface IIQLQueryCreationHints extends ISerializable {
    valueType: AttributeValues.Identity.TypeName;
    tags?: string[];
}

@type("IQLQueryCreationHints")
export class IQLQueryCreationHints extends Serializable implements IIQLQueryCreationHints {
    @serialize()
    @validate({ customValidator: IdentityAttribute.validateTypeName })
    public valueType: AttributeValues.Identity.TypeName;

    @serialize({ type: String })
    @validate({ nullable: true, customValidator: IdentityAttribute.validateTags })
    public tags?: string[];

    public static from(value: IIQLQueryCreationHints | Omit<IQLQueryCreationHintsJSON, "@type">): IQLQueryCreationHints {
        return this.fromAny(value);
    }
}

export interface IQLQueryJSON extends AbstractAttributeQueryJSON {
    "@type": "IQLQuery";
    queryString: string;
    attributeCreationHints?: IQLQueryCreationHintsJSON;
}

export interface IIQLQuery extends IAbstractAttributeQuery {
    queryString: string;
    attributeCreationHints?: IIQLQueryCreationHints;
}

@type("IQLQuery")
export class IQLQuery extends AbstractAttributeQuery implements IIQLQuery {
    @serialize()
    @validate({
        max: 4096,
        customValidator: (v) => {
            const result = iql.validate(v);
            return !result.isValid ? `invalid IQL query at character offset ${result.error.location.start.column}` : undefined;
        }
    })
    public queryString: string;

    @serialize()
    @validate({ nullable: true })
    public attributeCreationHints?: IQLQueryCreationHints;

    public static from(value: IIQLQuery | Omit<IQLQueryJSON, "@type">): IQLQuery {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): IQLQueryJSON {
        return super.toJSON(verbose, serializeAsString) as IQLQueryJSON;
    }
}
