import { serialize, type, validate } from "@js-soft/ts-serval";
import { ValueHints } from "../../hints";
import { AbstractString, AbstractStringJSON, IAbstractString } from "../AbstractString";

const MIN_SOCIAL_INSURANCE_NUMBER_LENGTH = 4;
const MAX_SOCIAL_INSURANCE_NUMBER_LENGTH = 32;

export interface SocialInsuranceNumberJSON extends AbstractStringJSON {
    "@type": "SocialInsuranceNumber";
}

export interface ISocialInsuranceNumber extends IAbstractString {}

@type("SocialInsuranceNumber")
export class SocialInsuranceNumber extends AbstractString implements ISocialInsuranceNumber {
    private static readonly regExp = new RegExp(/^[A-Z0-9]+$/);
    @serialize()
    @validate({
        min: MIN_SOCIAL_INSURANCE_NUMBER_LENGTH,
        max: MAX_SOCIAL_INSURANCE_NUMBER_LENGTH,
        regExp: SocialInsuranceNumber.regExp
    })
    public override value: string;

    public static from(value: ISocialInsuranceNumber | Omit<SocialInsuranceNumberJSON, "@type"> | string): SocialInsuranceNumber {
        return this.fromAny(value);
    }

    public static override get valueHints(): ValueHints {
        return super.valueHints.copyWith({
            min: MIN_SOCIAL_INSURANCE_NUMBER_LENGTH,
            max: MAX_SOCIAL_INSURANCE_NUMBER_LENGTH,
            pattern: SocialInsuranceNumber.regExp.toString().slice(1, -1).replaceAll("/", "\\/")
        });
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): SocialInsuranceNumberJSON {
        return super.toJSON(verbose, serializeAsString) as SocialInsuranceNumberJSON;
    }
}
