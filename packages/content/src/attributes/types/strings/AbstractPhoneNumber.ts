import { serialize, validate } from "@js-soft/ts-serval";
import { RenderHints, RenderHintsDataType, RenderHintsEditType, ValueHints } from "../../../attributes/hints/index.js";
import { AbstractString } from "../AbstractString.js";

export abstract class AbstractPhoneNumber extends AbstractString {
    @serialize()
    @validate({ min: 3, max: 100, regExp: new RegExp(/^[\d+\-x#*()/[\] ]{3,100}$/) })
    public override value: string;

    public static override get valueHints(): ValueHints {
        return super.valueHints.copyWith({
            min: 3,
            max: 100,
            pattern: "^[\\d+\\-x#*()/[\\] ]{3,100}$"
        });
    }

    public static override get renderHints(): RenderHints {
        return super.renderHints.copyWith({
            editType: RenderHintsEditType.InputLike,
            dataType: RenderHintsDataType.PhoneNumber
        });
    }
}
