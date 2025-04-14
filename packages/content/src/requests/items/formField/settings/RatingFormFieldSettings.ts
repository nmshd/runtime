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

    public static get minRating(): number {
        return 1;
    }

    public canCreate(): string | undefined {
        return;
    }

    public canAccept(response: string | number | boolean | string[]): string | undefined {
        if (Array.isArray(response)) {
            return "Only a selection form field can be accepted with an array.";
        }

        if (!RatingFormFieldSettings.isValidRating(response, RatingFormFieldSettings.minRating, this.maxRating)) {
            return "The response provided cannot be used to accept the form field.";
        }

        return;
    }

    private static isValidRating(value: any, minRating: number, maxRating: number): boolean {
        return Number.isInteger(value) && value >= minRating && value <= maxRating;
    }

    public static from(value: IRatingFormFieldSettings | RatingFormFieldSettingsJSON): RatingFormFieldSettings {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): RatingFormFieldSettingsJSON {
        return super.toJSON(verbose, serializeAsString) as RatingFormFieldSettingsJSON;
    }
}
