import { serialize, validate } from "@js-soft/ts-serval";
import { FormFieldSettings, FormFieldSettingsJSON, IFormFieldSettings } from "../FormFieldSettings";

export const minRating = 1;
type MaxRating = 5 | 6 | 7 | 8 | 9 | 10;

export interface RatingFormFieldSettingsJSON extends FormFieldSettingsJSON {
    maxRating: MaxRating;
}

export interface IRatingFormFieldSettings extends IFormFieldSettings {
    maxRating: MaxRating;
}

export class RatingFormFieldSettings extends FormFieldSettings implements IRatingFormFieldSettings {
    @serialize()
    @validate()
    public maxRating: MaxRating;

    public static from(value: IRatingFormFieldSettings | RatingFormFieldSettingsJSON): RatingFormFieldSettings {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): RatingFormFieldSettingsJSON {
        return super.toJSON(verbose, serializeAsString) as RatingFormFieldSettingsJSON;
    }
}
