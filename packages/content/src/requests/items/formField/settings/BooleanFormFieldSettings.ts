import { type } from "@js-soft/ts-serval";
import { FormFieldSettings, FormFieldSettingsJSON, IFormFieldSettings } from "./FormFieldSettings";

export interface BooleanFormFieldSettingsJSON extends FormFieldSettingsJSON {
    "@type": "BooleanFormFieldSettings";
}

export interface IBooleanFormFieldSettings extends IFormFieldSettings {}

@type("BooleanFormFieldSettings")
export class BooleanFormFieldSettings extends FormFieldSettings implements IBooleanFormFieldSettings {
    public canCreate(): string | undefined {
        return;
    }

    public canAccept(response: string | number | boolean | string[]): string | undefined {
        if (typeof response !== "boolean") {
            return "A boolean form field must be accepted with a boolean.";
        }

        return;
    }

    public static from(value: IBooleanFormFieldSettings | BooleanFormFieldSettingsJSON): BooleanFormFieldSettings {
        return this.fromAny(value);
    }
}
