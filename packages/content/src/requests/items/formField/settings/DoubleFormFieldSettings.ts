import { serialize, type, validate } from "@js-soft/ts-serval";
import { FormFieldSettings, FormFieldSettingsJSON, IFormFieldSettings } from "./FormFieldSettings";

export interface DoubleFormFieldSettingsJSON extends FormFieldSettingsJSON {
    "@type": "DoubleFormFieldSettings";
    unit?: string;
    min?: number;
    max?: number;
}

export interface IDoubleFormFieldSettings extends IFormFieldSettings {
    unit?: string;
    min?: number;
    max?: number;
}

@type("DoubleFormFieldSettings")
export class DoubleFormFieldSettings extends FormFieldSettings implements IDoubleFormFieldSettings {
    @serialize()
    @validate({ nullable: true })
    public unit?: string;

    @serialize()
    @validate({ nullable: true })
    public min?: number;

    @serialize()
    @validate({ nullable: true })
    public max?: number;

    public static from(value: IDoubleFormFieldSettings | DoubleFormFieldSettingsJSON): DoubleFormFieldSettings {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): DoubleFormFieldSettingsJSON {
        return super.toJSON(verbose, serializeAsString) as DoubleFormFieldSettingsJSON;
    }
}
