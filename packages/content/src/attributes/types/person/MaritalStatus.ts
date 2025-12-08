import { serialize, type, validate } from "@js-soft/ts-serval";
import { RenderHints, RenderHintsEditType, ValueHints, ValueHintsValue } from "../../../attributes/hints";
import { AbstractString, AbstractStringJSON, IAbstractString } from "../AbstractString";

/**
 * Particularly reflects marital status in Germany according to https://www.destatis.de/DE/Themen/Gesellschaft-Umwelt/Bevoelkerung/Haushalte-Familien/Glossar/familienstand.html
 */
export enum MaritalStatusValue {
    Single = "single",
    Married = "married",
    Separated = "separated",
    Divorced = "divorced",
    Widowed = "widowed",
    CivilPartnership = "civilPartnership",
    CivilPartnershipDissolved = "civilPartnershipDissolved",
    CivilPartnerDeceased = "civilPartnerDeceased"
}

export interface MaritalStatusJSON extends AbstractStringJSON {
    "@type": "MaritalStatus";
}

export interface IMaritalStatus extends IAbstractString {}

@type("MaritalStatus")
export class MaritalStatus extends AbstractString {
    @serialize()
    @validate({
        customValidator: (v) => (!Object.values(MaritalStatusValue).includes(v) ? `must be one of: ${Object.values(MaritalStatusValue)}` : undefined)
    })
    public override value: MaritalStatusValue;

    public static override get valueHints(): ValueHints {
        return super.valueHints.copyWith({
            values: Object.values(MaritalStatusValue).map((value) => ValueHintsValue.from({ key: value, displayName: `i18n://attributes.values.maritalStatus.${value}` }))
        });
    }

    public static override get renderHints(): RenderHints {
        return super.renderHints.copyWith({
            editType: RenderHintsEditType.ButtonLike
        });
    }

    public static from(value: IMaritalStatus | Omit<MaritalStatusJSON, "@type"> | string): MaritalStatus {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): MaritalStatusJSON {
        return super.toJSON(verbose, serializeAsString) as MaritalStatusJSON;
    }
}
