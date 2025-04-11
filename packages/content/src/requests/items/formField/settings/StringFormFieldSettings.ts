import { serialize, type, validate } from "@js-soft/ts-serval";
import { FormFieldSettings, FormFieldSettingsJSON, IFormFieldSettings } from "./FormFieldSettings";

export interface StringFormFieldSettingsJSON extends FormFieldSettingsJSON {
    "@type": "StringFormFieldSettings";
    allowNewLines?: true;
    min?: number;
    max?: number;
}

export interface IStringFormFieldSettings extends IFormFieldSettings {
    allowNewLines?: true;
    min?: number;
    max?: number;
}

@type("StringFormFieldSettings")
export class StringFormFieldSettings extends FormFieldSettings implements IStringFormFieldSettings {
    @serialize()
    @validate({ nullable: true })
    public allowNewLines?: true;

    @serialize()
    @validate({ nullable: true })
    public min?: number;

    @serialize()
    @validate({ nullable: true })
    public max?: number;

    public static from(value: IStringFormFieldSettings | StringFormFieldSettingsJSON): StringFormFieldSettings {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): StringFormFieldSettingsJSON {
        return super.toJSON(verbose, serializeAsString) as StringFormFieldSettingsJSON;
    }
}
