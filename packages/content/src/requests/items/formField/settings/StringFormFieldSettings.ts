import { serialize, type, validate } from "@js-soft/ts-serval";
import { FormFieldSettings, FormFieldSettingsJSON, IFormFieldSettings } from "./FormFieldSettings";

export interface StringFormFieldSettingsJSON extends FormFieldSettingsJSON {
    "@type": "StringFormFieldSettings";
    allowNewlines?: true;
    min?: number;
    max?: number;
}

export interface IStringFormFieldSettings extends IFormFieldSettings {
    allowNewlines?: true;
    min?: number;
    max?: number;
}

@type("StringFormFieldSettings")
export class StringFormFieldSettings extends FormFieldSettings implements IStringFormFieldSettings {
    @serialize()
    @validate({ nullable: true })
    public allowNewlines?: true;

    @serialize()
    @validate({ nullable: true })
    public min?: number;

    @serialize()
    @validate({ nullable: true })
    public max?: number;

    public canCreate(): string | undefined {
        if (this.max && this.min && this.max < this.min) {
            return "The max cannot be smaller than the min.";
        }

        return;
    }

    public canAccept(response: string | number | boolean | string[]): string | undefined {
        if (Array.isArray(response)) {
            return "Only a selection form field can be accepted with an array.";
        }

        if (typeof response !== "string") {
            return "The response provided cannot be used to accept the form field.";
        }

        if (this.max && response.length > this.max) {
            return "The length of the response cannot be greater than the max.";
        }

        if (this.min && response.length < this.min) {
            return "The length of the response cannot be smaller than the min.";
        }

        return;
    }

    public static from(value: IStringFormFieldSettings | StringFormFieldSettingsJSON): StringFormFieldSettings {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): StringFormFieldSettingsJSON {
        return super.toJSON(verbose, serializeAsString) as StringFormFieldSettingsJSON;
    }
}
