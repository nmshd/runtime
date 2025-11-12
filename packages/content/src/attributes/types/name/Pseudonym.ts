import { type } from "@js-soft/ts-serval";
import { AbstractString, AbstractStringJSON, IAbstractString } from "../AbstractString.js";

export interface PseudonymJSON extends AbstractStringJSON {
    "@type": "Pseudonym";
}

export interface IPseudonym extends IAbstractString {}

@type("Pseudonym")
export class Pseudonym extends AbstractString implements IPseudonym {
    public static from(value: IPseudonym | Omit<PseudonymJSON, "@type"> | string): Pseudonym {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): PseudonymJSON {
        return super.toJSON(verbose, serializeAsString) as PseudonymJSON;
    }
}
