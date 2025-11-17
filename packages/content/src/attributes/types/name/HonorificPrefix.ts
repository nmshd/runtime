import { type } from "@js-soft/ts-serval";
import { AbstractString, AbstractStringJSON, IAbstractString } from "../AbstractString.js";

export interface HonorificPrefixJSON extends AbstractStringJSON {
    "@type": "HonorificPrefix";
}

export interface IHonorificPrefix extends IAbstractString {}

@type("HonorificPrefix")
export class HonorificPrefix extends AbstractString implements HonorificPrefix {
    public static from(value: HonorificPrefix | Omit<HonorificPrefixJSON, "@type"> | string): HonorificPrefix {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): HonorificPrefixJSON {
        return super.toJSON(verbose, serializeAsString) as HonorificPrefixJSON;
    }
}
