import { type } from "@js-soft/ts-serval";
import { AbstractString, AbstractStringJSON, IAbstractString } from "../AbstractString.js";

export interface SurnameJSON extends AbstractStringJSON {
    "@type": "Surname";
}

export interface ISurname extends IAbstractString {}

@type("Surname")
export class Surname extends AbstractString implements ISurname {
    public static from(value: ISurname | Omit<SurnameJSON, "@type"> | string): Surname {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): SurnameJSON {
        return super.toJSON(verbose, serializeAsString) as SurnameJSON;
    }
}
