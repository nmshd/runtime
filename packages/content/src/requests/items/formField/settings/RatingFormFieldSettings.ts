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
    public static get minRating(): number {
        return 1;
    }

    @serialize()
    @validate({ min: 5, max: 10 })
    public maxRating: MaxRating;

    public canCreate(): string | undefined {
        return;
    }

    public canAccept(response: string | number | boolean | string[]): string | undefined {
        if (!this.isValidRating(response)) {
            return `The rating form field must be accepted with an integer between ${RatingFormFieldSettings.minRating} and ${this.maxRating}.`;
        }

        return;
    }

    private isValidRating(value: any): boolean {
        return Number.isInteger(value) && value >= RatingFormFieldSettings.minRating && value <= this.maxRating;
    }

    public static from(value: IRatingFormFieldSettings | RatingFormFieldSettingsJSON): RatingFormFieldSettings {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): RatingFormFieldSettingsJSON {
        return super.toJSON(verbose, serializeAsString) as RatingFormFieldSettingsJSON;
    }
}
