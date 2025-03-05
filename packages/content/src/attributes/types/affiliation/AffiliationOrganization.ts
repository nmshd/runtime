import { type } from "@js-soft/ts-serval";
import { AbstractStringJSON, IAbstractString } from "../AbstractString";
import { AbstractName } from "../strings/AbstractName";

export interface AffiliationOrganizationJSON extends AbstractStringJSON {
    "@type": "AffiliationOrganization";
}

export interface IAffiliationOrganization extends IAbstractString {}

@type("AffiliationOrganization")
export class AffiliationOrganization extends AbstractName implements IAffiliationOrganization {
    public static from(value: IAffiliationOrganization | Omit<AffiliationOrganizationJSON, "@type"> | string): AffiliationOrganization {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): AffiliationOrganizationJSON {
        return super.toJSON(verbose, serializeAsString) as AffiliationOrganizationJSON;
    }
}
