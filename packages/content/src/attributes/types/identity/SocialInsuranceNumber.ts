import { type } from "@js-soft/ts-serval";
import { AbstractString, AbstractStringJSON, IAbstractString } from "../AbstractString";

export interface SocialInsuranceNumberJSON extends AbstractStringJSON {
    "@type": "SocialInsuranceNumber";
}

export interface ISocialInsuranceNumber extends IAbstractString {}

@type("SocialInsuranceNumber")
export class SocialInsuranceNumber extends AbstractString implements ISocialInsuranceNumber {
    public static from(value: ISocialInsuranceNumber | Omit<SocialInsuranceNumberJSON, "@type"> | string): SocialInsuranceNumber {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): SocialInsuranceNumberJSON {
        return super.toJSON(verbose, serializeAsString) as SocialInsuranceNumberJSON;
    }
}
