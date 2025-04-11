import { ISerializable, Serializable, type } from "@js-soft/ts-serval";

export interface BooleanFormFieldSettingsJSON {
    "@type": "BooleanFormFieldSettings";
}

export interface IBooleanFormFieldSettings extends ISerializable {}

@type("BooleanFormFieldSettings")
export class BooleanFormFieldSettings extends Serializable implements IBooleanFormFieldSettings {
    public static from(value: IBooleanFormFieldSettings | BooleanFormFieldSettingsJSON): BooleanFormFieldSettings {
        return this.fromAny(value);
    }
}
