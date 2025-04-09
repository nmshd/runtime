import { ISerializable, Serializable } from "@js-soft/ts-serval";

export interface BooleanFormFieldSettingsJSON {}

export interface IBooleanFormFieldSettings extends ISerializable {}

export class BooleanFormFieldSettings extends Serializable implements IBooleanFormFieldSettings {
    public static from(value: IBooleanFormFieldSettings | BooleanFormFieldSettingsJSON): BooleanFormFieldSettings {
        return this.fromAny(value);
    }
}
