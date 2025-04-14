import { ISerializable, Serializable, type } from "@js-soft/ts-serval";

export interface BooleanFormFieldSettingsJSON {
    "@type": "BooleanFormFieldSettings";
}

export interface IBooleanFormFieldSettings extends ISerializable {}

@type("BooleanFormFieldSettings")
export class BooleanFormFieldSettings extends Serializable implements IBooleanFormFieldSettings {
    public canCreate(): string | undefined {
        return;
    }

    public canAccept(response: string | number | boolean | string[]): string | undefined {
        if (Array.isArray(response)) {
            return "Only a selection form field can be accepted with an array.";
        }

        if (typeof response !== "boolean") {
            return "The response provided cannot be used to accept the form field.";
        }

        return;
    }

    public static from(value: IBooleanFormFieldSettings | BooleanFormFieldSettingsJSON): BooleanFormFieldSettings {
        return this.fromAny(value);
    }
}
