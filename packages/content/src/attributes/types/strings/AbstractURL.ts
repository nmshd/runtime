import { serialize, validate } from "@js-soft/ts-serval";
import { RenderHints, RenderHintsDataType, RenderHintsEditType, ValueHints } from "../../../attributes/hints";
import { AbstractString } from "../AbstractString";

export abstract class AbstractURL extends AbstractString {
    private static readonly regExp = new RegExp(
        /^([A-Za-z]+:\/\/)?(www\.([A-Za-z0-9ÄäÖöÜüß]([A-Za-zÄäÖöÜüß0-9-]{0,61}[A-Za-zÄäÖöÜüß0-9])?\.)+|((?!www[.])([A-Za-z0-9ÄäÖöÜüß]([A-Za-zÄäÖöÜüß0-9-]{0,61}[A-Za-zÄäÖöÜüß0-9])?[.]))([A-Za-z0-9ÄäÖöÜüß]([A-Za-zÄäÖöÜüß0-9-]{0,61}[A-Za-zÄäÖöÜüß0-9])?\.)*)[A-Za-zÄäÖöÜüß0-9]([A-Za-zÄäÖöÜüß0-9-]{0,61}[A-Za-zÄäÖöÜüß0-9])([:][0-9]+)*(\/[A-Za-zÄäÖöÜüß0-9?#@!$&'()*+,;=%-]*)*$/
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
            pattern: JSON.stringify(AbstractURL.regExp, null, 2)
        });
    }

    public static override get renderHints(): RenderHints {
        return super.renderHints.copyWith({
            editType: RenderHintsEditType.InputLike,
            dataType: RenderHintsDataType.URL
        });
    }
}
