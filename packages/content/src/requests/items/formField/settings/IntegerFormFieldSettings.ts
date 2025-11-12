import { serialize, type, validate } from "@js-soft/ts-serval";
import { FormFieldSettings, FormFieldSettingsJSON, IFormFieldSettings } from "./FormFieldSettings.js";

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
    @validate({
        nullable: true,
        customValidator: (v) => (!Number.isInteger(v) ? "This value must be an integer." : undefined)
    })
    public min?: number;

    @serialize()
    @validate({
        nullable: true,
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
        if (typeof response !== "number" || !Number.isInteger(response)) {
            return "An integer form field must be accepted with an integer.";
        }

        if (this.max && response > this.max) {
            return `The response cannot be greater than the max ${this.max}.`;
        }

        if (this.min && response < this.min) {
            return `The response cannot be smaller than the min ${this.min}.`;
        }

        return;
    }

    public static from(value: IIntegerFormFieldSettings | IntegerFormFieldSettingsJSON): IntegerFormFieldSettings {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): IntegerFormFieldSettingsJSON {
        return super.toJSON(verbose, serializeAsString) as IntegerFormFieldSettingsJSON;
    }
}
