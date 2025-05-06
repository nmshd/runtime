import { serialize, validate } from "@js-soft/ts-serval";
import { CountryAlpha2 } from "@nmshd/core-types/src/CountriesAlpha2";
import { RenderHints, RenderHintsDataType, RenderHintsEditType, ValueHints, ValueHintsValue } from "../../../attributes/hints";
import { AbstractString } from "../AbstractString";

export abstract class AbstractCountry extends AbstractString {
    @serialize()
    @validate({
        customValidator: (v) => (!Object.values(CountryAlpha2).includes(v) ? `must be one of: ${Object.values(CountryAlpha2)}` : undefined)
    })
    public override value: CountryAlpha2;

    public static override get valueHints(): ValueHints {
        return super.valueHints.copyWith({
            min: 2,
            max: 2,
            values: Object.values(CountryAlpha2).map((value) => ValueHintsValue.from({ key: value, displayName: `i18n://attributes.values.countries.${value}` }))
        });
    }

    public static override get renderHints(): RenderHints {
        return super.renderHints.copyWith({
            editType: RenderHintsEditType.SelectLike,
            dataType: RenderHintsDataType.Country
        });
    }
}
