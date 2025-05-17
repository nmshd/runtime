import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreDate, ICoreDate } from "@nmshd/core-types";
import { AbstractAttributeQuery, AbstractAttributeQueryJSON, IAbstractAttributeQuery } from "./AbstractAttributeQuery";
import { AttributeValues } from "./AttributeValueTypes";

export interface IdentityAttributeQueryJSON extends AbstractAttributeQueryJSON {
    "@type": "IdentityAttributeQuery";
    valueType: AttributeValues.Identity.TypeName;
    /**
     * @uniqueItems true
     */
    tags?: string[];
    validFrom?: string;
    validTo?: string;
}

export interface IIdentityAttributeQuery extends IAbstractAttributeQuery {
    valueType: AttributeValues.Identity.TypeName;
    tags?: string[];
    validFrom?: ICoreDate;
    validTo?: ICoreDate;
}

@type("IdentityAttributeQuery")
export class IdentityAttributeQuery extends AbstractAttributeQuery implements IIdentityAttributeQuery {
    @serialize()
    @validate({
        customValidator: (v) => (!AttributeValues.Identity.TYPE_NAMES.includes(v) ? `must be one of: ${AttributeValues.Identity.TYPE_NAMES_STRINGIFIED}` : undefined)
    })
    public valueType: AttributeValues.Identity.TypeName;

    @serialize({ type: String })
    @validate({ nullable: true, customValidator: IdentityAttributeQuery.validateTags })
    public tags?: string[];

    @serialize()
    @validate({ nullable: true })
    public validFrom?: CoreDate;

    @serialize()
    @validate({ nullable: true })
    public validTo?: CoreDate;

    public static from(value: IIdentityAttributeQuery | Omit<IdentityAttributeQueryJSON, "@type">): IdentityAttributeQuery {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): IdentityAttributeQueryJSON {
        return super.toJSON(verbose, serializeAsString) as IdentityAttributeQueryJSON;
    }

    private static validateTags(tags: string[]) {
        if (tags.length > 20) {
            return "The maximum number of tags is 20.";
        }

        if (tags.some((tag) => tag.length > 250)) {
            return "The maximum length of a tag is 250 characters.";
        }

        return undefined;
    }
}
