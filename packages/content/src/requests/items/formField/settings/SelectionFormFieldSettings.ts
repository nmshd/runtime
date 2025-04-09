import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";

export interface SelectionFormFieldSettingsJSON {
    options: string[];
    allowMultipleSelection?: true;
}

export interface ISelectionFormFieldSettings extends ISerializable {
    options: string[];
    allowMultipleSelection?: true;
}

export class SelectionFormFieldSettings extends Serializable implements ISelectionFormFieldSettings {
    @serialize()
    @validate()
    public options: string[];

    @serialize()
    @validate({ nullable: true })
    public allowMultipleSelection?: true;

    public static from(value: ISelectionFormFieldSettings | SelectionFormFieldSettingsJSON): SelectionFormFieldSettings {
        return this.fromAny(value);
    }
}
