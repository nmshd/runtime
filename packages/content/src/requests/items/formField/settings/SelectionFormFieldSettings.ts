import { serialize, type, validate } from "@js-soft/ts-serval";
import _ from "lodash";
import { FormFieldSettings, FormFieldSettingsJSON, IFormFieldSettings } from "./FormFieldSettings";

export interface SelectionFormFieldSettingsJSON extends FormFieldSettingsJSON {
    "@type": "SelectionFormFieldSettings";
    options: string[];
    allowMultipleSelection?: true;
}

export interface ISelectionFormFieldSettings extends IFormFieldSettings {
    options: string[];
    allowMultipleSelection?: true;
}

@type("SelectionFormFieldSettings")
export class SelectionFormFieldSettings extends FormFieldSettings implements ISelectionFormFieldSettings {
    @serialize({ type: String })
    @validate()
    public options: string[];

    @serialize()
    @validate({ nullable: true })
    public allowMultipleSelection?: true;

    public canCreate(): string | undefined {
        if (this.options.length === 0) {
            return "A selection form field must provide at least one option.";
        }

        const uniqueOptions = new Set(this.options);
        if (uniqueOptions.size !== this.options.length) {
            return "A selection form field must provide unique options.";
        }

        return;
    }

    public canAccept(response: string | number | boolean | string[]): string | undefined {
        if (!Array.isArray(response) || !response.every((option) => typeof option === "string")) {
            return "A selection form field must be accepted with a string array.";
        }

        if (response.length === 0) {
            return "At least one option must be specified to accept a selection form field.";
        }

        const uniqueOptions = new Set(response);
        if (uniqueOptions.size !== response.length) {
            return "The options specified for accepting a selection form field must be unique.";
        }

        const unknownOptions: string[] = _.difference(response, this.options);
        if (unknownOptions.length > 0) {
            return `The selection form field does not provide the following option(s) for selection: ${unknownOptions.map((option) => `'${option}'`).join(", ")}.`;
        }

        if (!this.allowMultipleSelection && response.length !== 1) {
            return `A selection form field that does not allowMultipleSelection must be accepted with exactly one option.`;
        }

        return;
    }

    public static from(value: ISelectionFormFieldSettings | SelectionFormFieldSettingsJSON): SelectionFormFieldSettings {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): SelectionFormFieldSettingsJSON {
        return super.toJSON(verbose, serializeAsString) as SelectionFormFieldSettingsJSON;
    }
}
