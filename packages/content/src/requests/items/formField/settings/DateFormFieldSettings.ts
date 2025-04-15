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
        if (!(typeof response === "string" && CoreDate.from(response).dateTime.isValid)) {
            return "A date form field must be accepted with a valid date string in ISO 8601 format.";
        }

        return;
    }

    public static from(value: IDateFormFieldSettings | DateFormFieldSettingsJSON): DateFormFieldSettings {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): DateFormFieldSettingsJSON {
        return super.toJSON(verbose, serializeAsString) as DateFormFieldSettingsJSON;
    }
}
