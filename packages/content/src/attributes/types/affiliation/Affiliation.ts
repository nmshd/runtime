import { serialize, type, validate } from "@js-soft/ts-serval";
import { nameof } from "ts-simple-nameof";
import { AbstractAttributeValue } from "../../AbstractAttributeValue.js";
import { AbstractComplexValue, AbstractComplexValueJSON, IAbstractComplexValue } from "../../AbstractComplexValue.js";
import { RenderHints, ValueHints } from "../../hints/index.js";
import { AffiliationOrganization } from "./AffiliationOrganization.js";
import { AffiliationRole, IAffiliationRole } from "./AffiliationRole.js";
import { AffiliationUnit, IAffiliationUnit } from "./AffiliationUnit.js";

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
                [nameof<Affiliation>((a) => a.role)]: AffiliationRole.valueHints,
                [nameof<Affiliation>((a) => a.organization)]: AffiliationOrganization.valueHints,
                [nameof<Affiliation>((a) => a.unit)]: AffiliationUnit.valueHints
            }
        });
    }

    public static override get renderHints(): RenderHints {
        return super.renderHints.copyWith({
            propertyHints: {
                [nameof<Affiliation>((a) => a.role)]: AffiliationRole.renderHints,
                [nameof<Affiliation>((a) => a.organization)]: AffiliationOrganization.renderHints,
                [nameof<Affiliation>((a) => a.unit)]: AffiliationUnit.renderHints
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
