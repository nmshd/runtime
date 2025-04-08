import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";

export interface SelectionFormFieldJSON {
    options: string[];
    allowMultipleSelection?: boolean;
}

export interface ISelectionFormField extends ISerializable {
    options: string[];
    allowMultipleSelection?: boolean;
}

export class SelectionFormField extends Serializable implements ISelectionFormField {
    @serialize()
    @validate()
    public options: string[];

    @serialize()
    @validate({ nullable: true })
    public allowMultipleSelection: boolean;

    public static from(value: ISelectionFormField | SelectionFormFieldJSON): SelectionFormField {
        return this.fromAny(value);
    }
}
