import { serialize, validate } from "@js-soft/ts-serval";
import { RenderHints, RenderHintsDataType, RenderHintsEditType, ValueHints } from "../../../attributes/hints";
import { AbstractString } from "../AbstractString";

export abstract class AbstractURL extends AbstractString {
    @serialize()
    @validate({
        min: 3,
        max: 1024,
        regExp: new RegExp(
            /^([A-Za-z]{3,9}[:]([/][/])?|[:]([/][/])?|([/][/]))?((www[.])([A-Za-z0-9ÄäÖöÜüß]([A-Za-zÄäÖöÜüß0-9-]{0,61}[A-Za-zÄäÖöÜüß0-9])?[.])+|((?!www[.])([A-Za-z0-9ÄäÖöÜüß]([A-Za-zÄäÖöÜüß0-9-]{0,61}[A-Za-zÄäÖöÜüß0-9])?[.]))([A-Za-z0-9ÄäÖöÜüß]([A-Za-zÄäÖöÜüß0-9-]{0,61}[A-Za-zÄäÖöÜüß0-9])?[.])*)[A-Za-zÄäÖöÜüß0-9]([A-Za-zÄäÖöÜüß0-9-]{0,61}[A-Za-zÄäÖöÜüß0-9])([:][0-9]+)*([/][A-Za-zÄäÖöÜüß0-9?#@!$&'()*+,;=%-]*)*$/
        )
    })
    public override value: string;

    public static override get valueHints(): ValueHints {
        return super.valueHints.copyWith({
            min: 3,
            max: 1024,
            pattern:
                "/^([A-Za-z]{3,9}[:]([/][/])?|[:]([/][/])?|([/][/]))?((www[.])([A-Za-z0-9ÄäÖöÜüß]([A-Za-zÄäÖöÜüß0-9-]{0,61}[A-Za-zÄäÖöÜüß0-9])?[.])+|((?!www[.])([A-Za-z0-9ÄäÖöÜüß]([A-Za-zÄäÖöÜüß0-9-]{0,61}[A-Za-zÄäÖöÜüß0-9])?[.]))([A-Za-z0-9ÄäÖöÜüß]([A-Za-zÄäÖöÜüß0-9-]{0,61}[A-Za-zÄäÖöÜüß0-9])?[.])*)[A-Za-zÄäÖöÜüß0-9]([A-Za-zÄäÖöÜüß0-9-]{0,61}[A-Za-zÄäÖöÜüß0-9])([:][0-9]+)*([/][A-Za-zÄäÖöÜüß0-9?#@!$&'()*+,;=%-]*)*$/"
        });
    }

    public static override get renderHints(): RenderHints {
        return super.renderHints.copyWith({
            editType: RenderHintsEditType.InputLike,
            dataType: RenderHintsDataType.URL
        });
    }
}
