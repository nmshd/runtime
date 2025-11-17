import { serialize, type, validate } from "@js-soft/ts-serval";
import { FormFieldSettings, FormFieldSettingsJSON, IFormFieldSettings } from "./FormFieldSettings.js";

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
    @validate({
        nullable: true,
        min: 0,
        max: 4096,
        customValidator: (v) => (!Number.isInteger(v) ? "This value must be an integer." : undefined)
    })
    public min?: number;

    @serialize()
    @validate({
        nullable: true,
        min: 0,
        max: 4096,
        customValidator: (v) => (!Number.isInteger(v) ? "This value must be an integer." : undefined)
    })
    public max?: number;

    public canCreate(): string | undefined {
        if (this.max && this.min && this.max < this.min) {
            return "The max cannot be smaller than the min.";
        }

        return;
    }

    public canAccept(response: string | number | boolean | string[]): string | undefined {
        if (typeof response !== "string") {
            return "A string form field must be accepted with a string.";
        }

        if (this.max && response.length > this.max) {
            return `The length of the response cannot be greater than the max ${this.max}.`;
        }

        if (this.min && response.length < this.min) {
            return `The length of the response cannot be smaller than the min ${this.min}.`;
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
