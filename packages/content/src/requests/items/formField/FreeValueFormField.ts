import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";

export enum FreeValueType {
    String = "String",
    Integer = "Integer",
    Double = "Double",
    Date = "Date",
    Boolean = "Boolean"
}

export interface FreeValueFormFieldJSON {
    freeValueType: `${FreeValueType}`;
    allowNewLines?: true;
    unit?: string;
    min?: number;
    max?: number;
}

export interface IFreeValueFormField extends ISerializable {
    freeValueType: FreeValueType;
    allowNewLines?: true;
    unit?: string;
    min?: number;
    max?: number;
}

export class FreeValueFormField extends Serializable implements IFreeValueFormField {
    @serialize()
    @validate({
        customValidator: (v) => (!Object.values(FreeValueType).includes(v) ? `must be one of: ${Object.values(FreeValueType).map((o) => `"${o}"`)}` : undefined)
    })
    public freeValueType: FreeValueType;

    @serialize()
    @validate({ nullable: true })
    public allowNewLines?: true;

    @serialize()
    @validate({ nullable: true })
    public unit?: string;

    @serialize()
    @validate({ nullable: true })
    public min?: number;

    @serialize()
    @validate({ nullable: true })
    public max?: number;

    public static from(value: IFreeValueFormField | FreeValueFormFieldJSON): FreeValueFormField {
        return this.fromAny(value);
    }
}
