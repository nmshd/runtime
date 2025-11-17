import { serialize, type, validate } from "@js-soft/ts-serval";
import { AbstractAttributeQuery, AbstractAttributeQueryJSON, IAbstractAttributeQuery } from "./AbstractAttributeQuery.js";
import { AttributeValues } from "./AttributeValueTypes.js";
import { IdentityAttribute } from "./IdentityAttribute.js";

export interface IdentityAttributeQueryJSON extends AbstractAttributeQueryJSON {
    "@type": "IdentityAttributeQuery";
    valueType: AttributeValues.Identity.TypeName;
    tags?: string[];
}

export interface IIdentityAttributeQuery extends IAbstractAttributeQuery {
    valueType: AttributeValues.Identity.TypeName;
    tags?: string[];
}

@type("IdentityAttributeQuery")
export class IdentityAttributeQuery extends AbstractAttributeQuery implements IIdentityAttributeQuery {
    @serialize()
    @validate({
        customValidator: (v) => (!AttributeValues.Identity.TYPE_NAMES.includes(v) ? `must be one of: ${AttributeValues.Identity.TYPE_NAMES_STRINGIFIED}` : undefined)
    })
    public valueType: AttributeValues.Identity.TypeName;

    @serialize({ type: String })
    @validate({ nullable: true, customValidator: IdentityAttribute.validateTags })
    public tags?: string[];

    public static from(value: IIdentityAttributeQuery | Omit<IdentityAttributeQueryJSON, "@type">): IdentityAttributeQuery {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): IdentityAttributeQueryJSON {
        return super.toJSON(verbose, serializeAsString) as IdentityAttributeQueryJSON;
    }
}
