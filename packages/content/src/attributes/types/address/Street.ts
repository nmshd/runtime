import { type } from "@js-soft/ts-serval";
import { AbstractString, AbstractStringJSON, IAbstractString } from "../AbstractString.js";

export interface StreetJSON extends AbstractStringJSON {
    "@type": "Street";
}

export interface IStreet extends IAbstractString {}

@type("Street")
export class Street extends AbstractString implements IStreet {
    public static from(value: IStreet | Omit<StreetJSON, "@type"> | string): Street {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): StreetJSON {
        return super.toJSON(verbose, serializeAsString) as StreetJSON;
    }
}
