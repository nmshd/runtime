import { type } from "@js-soft/ts-serval";
import { AbstractString, AbstractStringJSON, IAbstractString } from "../AbstractString.js";

export interface AffiliationRoleJSON extends AbstractStringJSON {
    "@type": "AffiliationRole";
}

export interface IAffiliationRole extends IAbstractString {}

@type("AffiliationRole")
export class AffiliationRole extends AbstractString implements IAffiliationRole {
    public static from(value: IAffiliationRole | Omit<AffiliationRoleJSON, "@type"> | string): AffiliationRole {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): AffiliationRoleJSON {
        return super.toJSON(verbose, serializeAsString) as AffiliationRoleJSON;
    }
}
