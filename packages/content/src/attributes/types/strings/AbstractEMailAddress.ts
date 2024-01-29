import { serialize, validate } from "@js-soft/ts-serval";
import { RenderHints, RenderHintsDataType, RenderHintsEditType, ValueHints } from "../../../attributes/hints";
import { AbstractString } from "../AbstractString";

export abstract class AbstractEMailAddress extends AbstractString {
    // from https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address
    @serialize()
    @validate({
        min: 3,
        max: 100,
        regExp: new RegExp("^[A-Z0-9._%+-]+@[A-Z0-9.-]+.[A-Z]{2,}$", "i")
    })
    public override value: string;

    public static override get valueHints(): ValueHints {
        return super.valueHints.copyWith({
            min: 3,
            max: 100,
            pattern: "/^[A-Z0-9._%+-]+@[A-Z0-9.-]+.[A-Z]{2,}$/i"
        });
    }

    public static override get renderHints(): RenderHints {
        return super.renderHints.copyWith({
            editType: RenderHintsEditType.InputLike,
            dataType: RenderHintsDataType.EMailAddress
        });
    }
}
