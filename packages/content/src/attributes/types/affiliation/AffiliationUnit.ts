import { type } from "@js-soft/ts-serval";
import { AbstractString, AbstractStringJSON, IAbstractString } from "../AbstractString.js";

export interface AffiliationUnitJSON extends AbstractStringJSON {
    "@type": "AffiliationUnit";
}

export interface IAffiliationUnit extends IAbstractString {}

@type("AffiliationUnit")
export class AffiliationUnit extends AbstractString implements IAffiliationUnit {
    public static from(value: IAffiliationUnit | Omit<AffiliationUnitJSON, "@type"> | string): AffiliationUnit {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): AffiliationUnitJSON {
        return super.toJSON(verbose, serializeAsString) as AffiliationUnitJSON;
    }
}
