import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";

export interface SelectionFormFieldJSON {
    options: string[];
    allowMultipleSelection?: true;
}

export interface ISelectionFormField extends ISerializable {
    options: string[];
    allowMultipleSelection?: true;
}

export class SelectionFormField extends Serializable implements ISelectionFormField {
    @serialize()
    @validate()
    public options: string[];

    @serialize()
    @validate({ nullable: true })
    public allowMultipleSelection: true;

    public static from(value: ISelectionFormField | SelectionFormFieldJSON): SelectionFormField {
        return this.fromAny(value);
    }
}
