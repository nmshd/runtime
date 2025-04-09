import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";

export interface DoubleFormFieldSettingsJSON {
    unit?: string;
    min?: number;
    max?: number;
}

export interface IDoubleFormFieldSettings extends ISerializable {
    unit?: string;
    min?: number;
    max?: number;
}

export class DoubleFormFieldSettings extends Serializable implements IDoubleFormFieldSettings {
    @serialize()
    @validate({ nullable: true })
    public unit?: string;

    @serialize()
    @validate({ nullable: true })
    public min?: number;

    @serialize()
    @validate({ nullable: true })
    public max?: number;

    public static from(value: IDoubleFormFieldSettings | DoubleFormFieldSettingsJSON): DoubleFormFieldSettings {
        return this.fromAny(value);
    }
}
