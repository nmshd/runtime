import { type } from "@js-soft/ts-serval";
import { AbstractYear, AbstractYearJSON, IAbstractYear } from "../dates/index.js";

export interface BirthYearJSON extends AbstractYearJSON {
    "@type": "BirthYear";
}

export interface IBirthYear extends IAbstractYear {}

@type("BirthYear")
export class BirthYear extends AbstractYear implements IBirthYear {
    public static from(value: IBirthYear | Omit<BirthYearJSON, "@type"> | number): BirthYear {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): BirthYearJSON {
        return super.toJSON(verbose, serializeAsString) as BirthYearJSON;
    }
}
