import { type } from "@js-soft/ts-serval";
import { CoreDate } from "@nmshd/core-types";
import { FormFieldSettings, FormFieldSettingsJSON, IFormFieldSettings } from "./FormFieldSettings";

export interface DateFormFieldSettingsJSON extends FormFieldSettingsJSON {
    "@type": "DateFormFieldSettings";
}

export interface IDateFormFieldSettings extends IFormFieldSettings {}

@type("DateFormFieldSettings")
export class DateFormFieldSettings extends FormFieldSettings implements IDateFormFieldSettings {
    public canCreate(): string | undefined {
        return;
    }

    public canAccept(response: string | number | boolean | string[]): string | undefined {
        if (Array.isArray(response)) {
            return "Only a selection form field can be accepted with an array.";
        }

        if (!DateFormFieldSettings.isValidDate(response)) {
            return "The response provided cannot be used to accept the form field.";
        }

        return;
    }

    private static isValidDate(value: any): boolean {
        return typeof value === "string" && CoreDate.from(value).dateTime.isValid;
    }

    public static from(value: IDateFormFieldSettings | DateFormFieldSettingsJSON): DateFormFieldSettings {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): DateFormFieldSettingsJSON {
        return super.toJSON(verbose, serializeAsString) as DateFormFieldSettingsJSON;
    }
}
