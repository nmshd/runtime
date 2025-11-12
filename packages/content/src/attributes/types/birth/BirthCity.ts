import { type } from "@js-soft/ts-serval";
import { City, CityJSON, ICity } from "../address/index.js";

export interface BirthCityJSON extends Omit<CityJSON, "@type"> {
    "@type": "BirthCity";
}

export interface IBirthCity extends ICity {}

@type("BirthCity")
export class BirthCity extends City implements IBirthCity {
    public static override from(value: IBirthCity | Omit<BirthCityJSON, "@type"> | string): BirthCity {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): BirthCityJSON {
        return super.toJSON(verbose, serializeAsString) as BirthCityJSON;
    }
}
