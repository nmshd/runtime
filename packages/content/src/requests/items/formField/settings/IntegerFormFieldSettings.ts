import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";

export interface IntegerFormFieldSettingsJSON {
    unit?: string;
    min?: number;
    max?: number;
}

export interface IIntegerFormFieldSettings extends ISerializable {
    unit?: string;
    min?: number;
    max?: number;
}

export class IntegerFormFieldSettings extends Serializable implements IIntegerFormFieldSettings {
    @serialize()
    @validate({ nullable: true })
    public unit?: string;

    @serialize()
    @validate({ nullable: true })
    public min?: number;

    @serialize()
    @validate({ nullable: true })
    public max?: number;

    public static from(value: IIntegerFormFieldSettings | IntegerFormFieldSettingsJSON): IntegerFormFieldSettings {
        return this.fromAny(value);
    }
}
