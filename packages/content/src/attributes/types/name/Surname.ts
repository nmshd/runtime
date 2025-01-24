import { type } from "@js-soft/ts-serval";
import { AbstractStringJSON, IAbstractString } from "../AbstractString";
import { AbstractNaturalPersonName } from "../strings/AbstractNaturalPersonName";

export interface SurnameJSON extends AbstractStringJSON {
    "@type": "Surname";
}

export interface ISurname extends IAbstractString {}

@type("Surname")
export class Surname extends AbstractNaturalPersonName implements ISurname {
    public static from(value: ISurname | Omit<SurnameJSON, "@type"> | string): Surname {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): SurnameJSON {
        return super.toJSON(verbose, serializeAsString) as SurnameJSON;
    }
}
