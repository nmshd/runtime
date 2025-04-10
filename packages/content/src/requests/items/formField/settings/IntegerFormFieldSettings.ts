import { serialize, type, validate } from "@js-soft/ts-serval";
import { FormFieldSettings, FormFieldSettingsJSON, IFormFieldSettings } from "./FormFieldSettings";

export interface IntegerFormFieldSettingsJSON extends FormFieldSettingsJSON {
    "@type": "IntegerFormFieldSettings";
    unit?: string;
    min?: number;
    max?: number;
}

export interface IIntegerFormFieldSettings extends IFormFieldSettings {
    unit?: string;
    min?: number;
    max?: number;
}

@type("IntegerFormFieldSettings")
export class IntegerFormFieldSettings extends FormFieldSettings implements IIntegerFormFieldSettings {
    @serialize()
    @validate({ nullable: true })
    public unit?: string;

    @serialize()
    @validate({ nullable: true })
    public min?: number;

    @serialize()
    @validate({ nullable: true })
    public max?: number;

    public static from(value: IIntegerFormFieldSettings | IntegerFormFieldSettingsJSON): IntegerFormFieldSettings {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): IntegerFormFieldSettingsJSON {
        return super.toJSON(verbose, serializeAsString) as IntegerFormFieldSettingsJSON;
    }
}
