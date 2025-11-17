import { serialize, validate } from "@js-soft/ts-serval";
import { RenderHints, RenderHintsDataType, RenderHintsEditType, ValueHints } from "../../../attributes/hints/index.js";
import { AbstractString } from "../AbstractString.js";

export abstract class AbstractHEXColor extends AbstractString {
    @serialize()
    @validate({ min: 4, max: 9, regExp: new RegExp("^#([0-9A-F]{3}){1,2}$", "i") })
    public override value: string;

    public static override get valueHints(): ValueHints {
        return super.valueHints.copyWith({
            min: 4,
            max: 9,
            pattern: "^#([0-9A-F]{3}){1,2}$/i"
        });
    }

    public static override get renderHints(): RenderHints {
        return super.renderHints.copyWith({
            editType: RenderHintsEditType.InputLike,
            dataType: RenderHintsDataType.HEXColor
        });
    }
}
