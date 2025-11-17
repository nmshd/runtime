import { type } from "@js-soft/ts-serval";
import { AbstractString, AbstractStringJSON, IAbstractString } from "../AbstractString.js";

export interface BirthNameJSON extends AbstractStringJSON {
    "@type": "BirthName";
}

export interface IBirthName extends IAbstractString {}

@type("BirthName")
export class BirthName extends AbstractString implements IBirthName {
    public static from(value: IBirthName | Omit<BirthNameJSON, "@type"> | string): BirthName {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): BirthNameJSON {
        return super.toJSON(verbose, serializeAsString) as BirthNameJSON;
    }
}
