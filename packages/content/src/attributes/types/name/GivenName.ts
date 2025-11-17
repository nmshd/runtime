import { type } from "@js-soft/ts-serval";
import { AbstractString, AbstractStringJSON, IAbstractString } from "../AbstractString.js";

export interface GivenNameJSON extends AbstractStringJSON {
    "@type": "GivenName";
}

export interface IGivenName extends IAbstractString {}

@type("GivenName")
export class GivenName extends AbstractString implements IGivenName {
    public static from(value: IGivenName | Omit<GivenNameJSON, "@type"> | string): GivenName {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): GivenNameJSON {
        return super.toJSON(verbose, serializeAsString) as GivenNameJSON;
    }
}
