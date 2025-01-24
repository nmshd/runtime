import { type } from "@js-soft/ts-serval";
import { AbstractStringJSON, IAbstractString } from "../AbstractString";
import { AbstractNaturalPersonName } from "../strings/AbstractNaturalPersonName";

export interface HonorificSuffixJSON extends AbstractStringJSON {
    "@type": "HonorificSuffix";
}

export interface IHonorificSuffix extends IAbstractString {}

@type("HonorificSuffix")
export class HonorificSuffix extends AbstractNaturalPersonName implements IHonorificSuffix {
    public static from(value: IHonorificSuffix | Omit<HonorificSuffixJSON, "@type"> | string): HonorificSuffix {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): HonorificSuffixJSON {
        return super.toJSON(verbose, serializeAsString) as HonorificSuffixJSON;
    }
}
