import { serialize, validate } from "@js-soft/ts-serval";
import { RenderHints, RenderHintsDataType, RenderHintsEditType, ValueHints } from "../../../attributes/hints";
import { AbstractString } from "../AbstractString";

export abstract class AbstractEMailAddress extends AbstractString {
    // from https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address
    @serialize()
    @validate({
        min: 3,
        max: 254,
        regExp: new RegExp(
            "^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:[.][a-z0-9!#$%&'*+/=?^_`{|}~-]+){0,}@(?:[a-z0-9\u00c4\u00e4\u00d6\u00f6\u00dc\u00fc\u00df](?:[a-z\u00c4\u00e4\u00d6\u00f6\u00dc\u00fc\u00df0-9-]{0,61}[a-z\u00c4\u00e4\u00d6\u00f6\u00dc\u00fc\u00df0-9]){0,1}[.])+[a-z\u00c4\u00e4\u00d6\u00f6\u00dc\u00fc\u00df0-9](?:[a-z\u00c4\u00e4\u00d6\u00f6\u00dc\u00fc\u00df0-9-]{0,61}[a-z\u00c4\u00e4\u00d6\u00f6\u00dc\u00fc\u00df0-9])$",
            "i"
        )
    })
    public override value: string;

    public static override get valueHints(): ValueHints {
        return super.valueHints.copyWith({
            min: 3,
            max: 100,
            pattern:
                "^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:[.][a-z0-9!#$%&'*+/=?^_`{|}~-]+){0,}@(?:[a-z0-9\u00c4\u00e4\u00d6\u00f6\u00dc\u00fc\u00df](?:[a-z\u00c4\u00e4\u00d6\u00f6\u00dc\u00fc\u00df0-9-]{0,61}[a-z\u00c4\u00e4\u00d6\u00f6\u00dc\u00fc\u00df0-9]){0,1}[.])+[a-z\u00c4\u00e4\u00d6\u00f6\u00dc\u00fc\u00df0-9](?:[a-z\u00c4\u00e4\u00d6\u00f6\u00dc\u00fc\u00df0-9-]{0,61}[a-z\u00c4\u00e4\u00d6\u00f6\u00dc\u00fc\u00df0-9])$/i"
        });
    }

    public static override get renderHints(): RenderHints {
        return super.renderHints.copyWith({
            editType: RenderHintsEditType.InputLike,
            dataType: RenderHintsDataType.EMailAddress
        });
    }
}
