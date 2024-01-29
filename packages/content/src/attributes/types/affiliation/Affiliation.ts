import { serialize, type, validate } from "@js-soft/ts-serval";
import nameOf from "easy-tsnameof";
import { AbstractAttributeValue } from "../../AbstractAttributeValue";
import { AbstractComplexValue, AbstractComplexValueJSON, IAbstractComplexValue } from "../../AbstractComplexValue";
import { RenderHints, ValueHints } from "../../hints";
import { AffiliationOrganization } from "./AffiliationOrganization";
import { AffiliationRole, IAffiliationRole } from "./AffiliationRole";
import { AffiliationUnit, IAffiliationUnit } from "./AffiliationUnit";

export interface AffiliationJSON extends AbstractComplexValueJSON {
    "@type": "Affiliation";
    organization: string;
    role?: string;
    unit?: string;
}

export interface IAffiliation extends IAbstractComplexValue {
    organization: AffiliationOrganization | string;
    role?: IAffiliationRole | string;
    unit?: IAffiliationUnit | string;
}

@type("Affiliation")
export class Affiliation extends AbstractComplexValue implements IAffiliation {
    public static readonly propertyNames = nameOf<Affiliation, never>();

    @serialize({ customGenerator: AbstractAttributeValue.valueGenerator })
    @validate({ nullable: true })
    public role?: AffiliationRole;

    @serialize({ customGenerator: AbstractAttributeValue.valueGenerator })
    @validate()
    public organization: AffiliationOrganization;

    @serialize({ customGenerator: AbstractAttributeValue.valueGenerator })
    @validate({ nullable: true })
    public unit?: AffiliationUnit;

    public static get valueHints(): ValueHints {
        return ValueHints.from({
            propertyHints: {
                [this.propertyNames.role.$path]: AffiliationRole.valueHints,
                [this.propertyNames.organization.$path]: AffiliationOrganization.valueHints,
                [this.propertyNames.unit.$path]: AffiliationUnit.valueHints
            }
        });
    }

    public static override get renderHints(): RenderHints {
        return super.renderHints.copyWith({
            propertyHints: {
                [this.propertyNames.role.$path]: AffiliationRole.renderHints,
                [this.propertyNames.organization.$path]: AffiliationOrganization.renderHints,
                [this.propertyNames.unit.$path]: AffiliationUnit.renderHints
            }
        });
    }

    public static from(value: IAffiliation | Omit<AffiliationJSON, "@type">): Affiliation {
        return this.fromAny(value);
    }

    public override toString(): string {
        const value: string[] = [this.organization.toString()];
        if (this.unit) {
            value.push(this.unit.toString());
        }
        if (this.role) {
            value.push(this.role.toString());
        }

        return value.join(", ");
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): AffiliationJSON {
        return super.toJSON(verbose, serializeAsString) as AffiliationJSON;
    }
}
