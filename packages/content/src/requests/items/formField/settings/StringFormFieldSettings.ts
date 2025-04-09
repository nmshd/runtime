import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";

export interface StringFormFieldSettingsJSON {
    allowNewLines?: true;
    min?: number;
    max?: number;
}

export interface IStringFormFieldSettings extends ISerializable {
    allowNewLines?: true;
    min?: number;
    max?: number;
}

export class StringFormFieldSettings extends Serializable implements IStringFormFieldSettings {
    @serialize()
    @validate({ nullable: true })
    public allowNewLines?: true;

    @serialize()
    @validate({ nullable: true })
    public min?: number;

    @serialize()
    @validate({ nullable: true })
    public max?: number;

    public static from(value: IStringFormFieldSettings | StringFormFieldSettingsJSON): StringFormFieldSettings {
        return this.fromAny(value);
    }
}
