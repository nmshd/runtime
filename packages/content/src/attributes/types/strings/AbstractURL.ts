import { serialize, validate } from "@js-soft/ts-serval";
import { RenderHints, RenderHintsDataType, RenderHintsEditType, ValueHints } from "../../../attributes/hints/index.js";
import { AbstractString } from "../AbstractString.js";

export abstract class AbstractURL extends AbstractString {
    private static readonly regExp = new RegExp(
        /^([A-Za-z]+:\/\/)?((www\.)|(?!www\.))([A-Za-z0-9ÄäÖöÜüß]([A-Za-zÄäÖöÜüß0-9-]{0,61}[A-Za-zÄäÖöÜüß0-9])?\.)+([A-Za-z0-9ÄäÖöÜüß]([A-Za-zÄäÖöÜüß0-9-]{0,61}[A-Za-zÄäÖöÜüß0-9])?)(:[0-9]+)?(\/[A-Za-zÄäÖöÜüß0-9?#@!$&'()*+,;=%-]*)*$/
    );

    @serialize()
    @validate({
        min: 3,
        max: 1024,
        regExp: AbstractURL.regExp
    })
    public override value: string;

    public static override get valueHints(): ValueHints {
        return super.valueHints.copyWith({
            min: 3,
            max: 1024,
            pattern: AbstractURL.regExp.toString().slice(1, -1)
        });
    }

    public static override get renderHints(): RenderHints {
        return super.renderHints.copyWith({
            editType: RenderHintsEditType.InputLike,
            dataType: RenderHintsDataType.URL
        });
    }
}
