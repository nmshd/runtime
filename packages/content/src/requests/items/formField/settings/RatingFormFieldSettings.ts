import { serialize, type, validate } from "@js-soft/ts-serval";
import { FormFieldSettings, FormFieldSettingsJSON, IFormFieldSettings } from "./FormFieldSettings";

type MaxRating = 5 | 6 | 7 | 8 | 9 | 10;

export interface RatingFormFieldSettingsJSON extends FormFieldSettingsJSON {
    "@type": "RatingFormFieldSettings";
    maxRating: MaxRating;
}

export interface IRatingFormFieldSettings extends IFormFieldSettings {
    maxRating: MaxRating;
}

@type("RatingFormFieldSettings")
export class RatingFormFieldSettings extends FormFieldSettings implements IRatingFormFieldSettings {
    @serialize()
    @validate({ min: 5, max: 10 })
    public maxRating: MaxRating;

    private static readonly MIN_RATING = 1;
    public static get minRating(): number {
        return this.MIN_RATING;
    }

    public static from(value: IRatingFormFieldSettings | RatingFormFieldSettingsJSON): RatingFormFieldSettings {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): RatingFormFieldSettingsJSON {
        return super.toJSON(verbose, serializeAsString) as RatingFormFieldSettingsJSON;
    }
}
