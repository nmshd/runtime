import { FormFieldSettings, FormFieldSettingsJSON, IFormFieldSettings } from "../FormFieldSettings";

export interface DateFormFieldSettingsJSON extends FormFieldSettingsJSON {}

export interface IDateFormFieldSettings extends IFormFieldSettings {}

export class DateFormFieldSettings extends FormFieldSettings implements IDateFormFieldSettings {
    public static from(value: IDateFormFieldSettings | DateFormFieldSettingsJSON): DateFormFieldSettings {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): DateFormFieldSettingsJSON {
        return super.toJSON(verbose, serializeAsString) as DateFormFieldSettingsJSON;
    }
}
