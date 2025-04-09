import { ISerializable, Serializable } from "@js-soft/ts-serval";

export interface DateFormFieldSettingsJSON {}

export interface IDateFormFieldSettings extends ISerializable {}

export class DateFormFieldSettings extends Serializable implements IDateFormFieldSettings {
    public static from(value: IDateFormFieldSettings | DateFormFieldSettingsJSON): DateFormFieldSettings {
        return this.fromAny(value);
    }
}
