import { type } from "@js-soft/ts-serval";
import { Country, CountryJSON, ICountry } from "../address/index.js";

export interface BirthCountryJSON extends Omit<CountryJSON, "@type"> {
    "@type": "BirthCountry";
}

export interface IBirthCountry extends ICountry {}

@type("BirthCountry")
export class BirthCountry extends Country implements IBirthCountry {
    public static override from(value: IBirthCountry | Omit<BirthCountryJSON, "@type"> | string): BirthCountry {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): BirthCountryJSON {
        return super.toJSON(verbose, serializeAsString) as BirthCountryJSON;
    }
}
