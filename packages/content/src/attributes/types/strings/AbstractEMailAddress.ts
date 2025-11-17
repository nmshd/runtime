import { serialize, validate } from "@js-soft/ts-serval";
import { RenderHints, RenderHintsDataType, RenderHintsEditType, ValueHints } from "../../../attributes/hints/index.js";
import { AbstractString } from "../AbstractString.js";

export abstract class AbstractEMailAddress extends AbstractString {
    // from https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address
    private static readonly regExp = new RegExp(
        /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@([A-Za-z0-9ÄäÖöÜüß]([A-Za-z0-9ÄäÖöÜüß-]{0,61}[A-Za-z0-9ÄäÖöÜüß])?\.)+[A-Za-z0-9ÄäÖöÜüß][A-Za-z0-9ÄäÖöÜüß-]{0,61}[A-Za-z0-9ÄäÖöÜüß]$/
    );
    @serialize()
    @validate({
        min: 3,
        max: 254,
        regExp: AbstractEMailAddress.regExp
    })
    public override value: string;

    public static override get valueHints(): ValueHints {
        return super.valueHints.copyWith({
            min: 3,
            max: 254,
            pattern: AbstractEMailAddress.regExp.toString().slice(1, -1).replaceAll("/", "\\/")
        });
    }

    public static override get renderHints(): RenderHints {
        return super.renderHints.copyWith({
            editType: RenderHintsEditType.InputLike,
            dataType: RenderHintsDataType.EMailAddress
        });
    }
}
