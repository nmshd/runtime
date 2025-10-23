import { serialize, validate } from "@js-soft/ts-serval";
import { AbstractAttributeValue, AbstractAttributeValueJSON, IAbstractAttributeValue } from "../AbstractAttributeValue";
import { RenderHints, RenderHintsEditType, RenderHintsTechnicalType, ValueHints } from "../hints";

export interface AbstractStringJSON extends AbstractAttributeValueJSON {
    value: string;
}

export interface IAbstractString extends IAbstractAttributeValue {
    value: string;
}

export class AbstractString extends AbstractAttributeValue implements IAbstractString {
    @serialize()
    @validate({ max: 100 })
    public value: string;

    public static override preFrom(value: any): any {
        if (typeof value !== "object") value = { value };
        return value;
    }

    public override toString(): string {
        return this.value;
    }

    public static get valueHints(): ValueHints {
        return ValueHints.from({
            max: 100
        });
    }

    public static get renderHints(): RenderHints {
        return RenderHints.from({
            editType: RenderHintsEditType.InputLike,
            technicalType: RenderHintsTechnicalType.String
        });
    }
}
