import { serialize, validate } from "@js-soft/ts-serval";
import { AbstractAttributeValue, AbstractAttributeValueJSON, IAbstractAttributeValue } from "../AbstractAttributeValue.js";
import { RenderHints, RenderHintsEditType, RenderHintsTechnicalType, ValueHints } from "../hints/index.js";

export interface AbstractBooleanJSON extends AbstractAttributeValueJSON {
    value: boolean;
}

export interface IAbstractBoolean extends IAbstractAttributeValue {
    value: boolean;
}

export class AbstractBoolean extends AbstractAttributeValue implements IAbstractBoolean {
    @serialize()
    @validate()
    public value: boolean;

    public static override preFrom(value: any): any {
        if (typeof value !== "object") value = { value };
        return value;
    }

    public override toString(): string {
        return `${this.value}`;
    }

    public static get valueHints(): ValueHints {
        return ValueHints.from({});
    }

    public static get renderHints(): RenderHints {
        return RenderHints.from({
            editType: RenderHintsEditType.InputLike,
            technicalType: RenderHintsTechnicalType.Boolean
        });
    }
}
