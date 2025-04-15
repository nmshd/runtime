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
        if (typeof response !== "boolean") {
            return "A boolean form field must be accepted with a boolean.";
        }

        return;
    }

    public static from(value: IBooleanFormFieldSettings | BooleanFormFieldSettingsJSON): BooleanFormFieldSettings {
        return this.fromAny(value);
    }
}
