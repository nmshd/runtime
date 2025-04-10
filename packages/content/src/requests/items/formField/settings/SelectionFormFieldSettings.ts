import { serialize, validate } from "@js-soft/ts-serval";
import { FormFieldSettings, FormFieldSettingsJSON, IFormFieldSettings } from "../FormFieldSettings";

export interface SelectionFormFieldSettingsJSON extends FormFieldSettingsJSON {
    options: string[];
    allowMultipleSelection?: true;
}

export interface ISelectionFormFieldSettings extends IFormFieldSettings {
    options: string[];
    allowMultipleSelection?: true;
}

export class SelectionFormFieldSettings extends FormFieldSettings implements ISelectionFormFieldSettings {
    @serialize()
    @validate()
    public options: string[];

    @serialize()
    @validate({ nullable: true })
    public allowMultipleSelection?: true;

    public static from(value: ISelectionFormFieldSettings | SelectionFormFieldSettingsJSON): SelectionFormFieldSettings {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): SelectionFormFieldSettingsJSON {
        return super.toJSON(verbose, serializeAsString) as SelectionFormFieldSettingsJSON;
    }
}
