import { Serializable, serialize, type, validate, ValidationError } from "@js-soft/ts-serval";
import { nameof } from "ts-simple-nameof";
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

    protected static override postFrom<T extends Serializable>(value: T): T {
        if (!(value instanceof IntegerFormFieldSettings)) {
            throw new Error("this should never happen");
        }

        if (value.min && !Number.isInteger(value.min)) {
            throw new ValidationError(
                IntegerFormFieldSettings.name,
                nameof<IntegerFormFieldSettings>((x) => x.min),
                `If the ${nameof<IntegerFormFieldSettings>((x) => x.min)} of an integer form field is set, it must be an integer.`
            );
        }

        if (value.max && !Number.isInteger(value.max)) {
            throw new ValidationError(
                IntegerFormFieldSettings.name,
                nameof<IntegerFormFieldSettings>((x) => x.max),
                `If the ${nameof<IntegerFormFieldSettings>((x) => x.max)} of an integer form field is set, it must be an integer.`
            );
        }

        return value;
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): IntegerFormFieldSettingsJSON {
        return super.toJSON(verbose, serializeAsString) as IntegerFormFieldSettingsJSON;
    }
}
