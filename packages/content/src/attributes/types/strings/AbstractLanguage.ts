import { serialize, validate } from "@js-soft/ts-serval";
import { LanguageISO639 } from "@nmshd/core-types/src/LanguagesISO639";
import { RenderHints, RenderHintsDataType, RenderHintsEditType, ValueHints, ValueHintsValue } from "../../../attributes/hints";
import { AbstractString } from "../AbstractString";

export abstract class AbstractLanguage extends AbstractString {
    @serialize()
    @validate({
        min: 2,
        max: 2,
        customValidator: (v) => (!Object.values(LanguageISO639).includes(v) ? `must be one of: ${Object.values(LanguageISO639)}` : undefined)
    })
    public override value: LanguageISO639;

    public static override get valueHints(): ValueHints {
        return super.valueHints.copyWith({
            min: 2,
            max: 2,
            values: Object.values(LanguageISO639).map((value) => ValueHintsValue.from({ key: value, displayName: `i18n://attributes.values.languages.${value}` }))
        });
    }

    public static override get renderHints(): RenderHints {
        return super.renderHints.copyWith({
            editType: RenderHintsEditType.SelectLike,
            dataType: RenderHintsDataType.Language
        });
    }
}
