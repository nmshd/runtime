import { serialize, validate } from "@js-soft/ts-serval";
import { RenderHints, RenderHintsDataType, RenderHintsEditType, ValueHints } from "../../../attributes/hints/index.js";
import { AbstractInteger, AbstractIntegerJSON, IAbstractInteger } from "../AbstractInteger.js";

export interface AbstractYearJSON extends AbstractIntegerJSON {
    value: number;
}

export interface IAbstractYear extends IAbstractInteger {
    value: number;
}

export abstract class AbstractYear extends AbstractInteger {
    @serialize()
    @validate({
        customValidator: (v) => (v < 1 || v > 9999 || !Number.isInteger(v) ? "must be an integer value between 1 and 9999" : undefined)
    })
    public override value: number;

    public static override get valueHints(): ValueHints {
        return super.valueHints.copyWith({
            min: 1,
            max: 9999
        });
    }

    public static override get renderHints(): RenderHints {
        return super.renderHints.copyWith({
            editType: RenderHintsEditType.SelectLike,
            dataType: RenderHintsDataType.Year
        });
    }
}
