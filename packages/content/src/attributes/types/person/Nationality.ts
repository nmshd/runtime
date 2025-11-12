import { type } from "@js-soft/ts-serval";
import { AbstractStringJSON, IAbstractString } from "../AbstractString.js";
import { AbstractCountry } from "../strings/index.js";

export interface NationalityJSON extends AbstractStringJSON {
    "@type": "Nationality";
}

export interface INationality extends IAbstractString {}

@type("Nationality")
export class Nationality extends AbstractCountry implements INationality {
    public static from(value: INationality | Omit<NationalityJSON, "@type"> | string): Nationality {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): NationalityJSON {
        return super.toJSON(verbose, serializeAsString) as NationalityJSON;
    }
}
