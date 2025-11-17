import { serialize, validate } from "@js-soft/ts-serval";
import { DateTime } from "luxon";
import { RenderHints, RenderHintsDataType, RenderHintsEditType, ValueHints } from "../../../attributes/hints/index.js";
import { AbstractString } from "../AbstractString.js";

export abstract class AbstractDateString extends AbstractString {
    private static readonly format = "yyyy-MM-dd";

    @serialize()
    @validate({
        min: 10,
        max: 10,
        customValidator: (v) => (!DateTime.fromFormat(v, AbstractDateString.format).isValid ? `must match the following format: '${AbstractDateString.format}'` : undefined)
    })
    public override value: string;

    public static override get valueHints(): ValueHints {
        return super.valueHints.copyWith({
            min: 10,
            max: 10
        });
    }

    public static override get renderHints(): RenderHints {
        return super.renderHints.copyWith({
            editType: RenderHintsEditType.SelectLike,
            dataType: RenderHintsDataType.Date
        });
    }
}
