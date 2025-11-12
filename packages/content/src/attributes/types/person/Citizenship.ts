import { type } from "@js-soft/ts-serval";
import { AbstractStringJSON, IAbstractString } from "../AbstractString.js";
import { AbstractCountry } from "../strings/index.js";

export interface CitizenshipJSON extends AbstractStringJSON {
    "@type": "Citizenship";
}

export interface ICitizenship extends IAbstractString {}

@type("Citizenship")
export class Citizenship extends AbstractCountry implements ICitizenship {
    public static from(value: ICitizenship | Omit<CitizenshipJSON, "@type"> | string): Citizenship {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): CitizenshipJSON {
        return super.toJSON(verbose, serializeAsString) as CitizenshipJSON;
    }
}
