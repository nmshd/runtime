import { serialize, validate } from "@js-soft/ts-serval";
import { RenderHints, RenderHintsDataType, RenderHintsEditType, ValueHints } from "../../../attributes/hints";
import { AbstractString } from "../AbstractString";

export abstract class AbstractXML extends AbstractString {
    @serialize()
    @validate({ max: 50000 })
    public override value: string;

    public static override get valueHints(): ValueHints {
        return super.valueHints.copyWith({
            max: 50000
        });
    }

    public static override get renderHints(): RenderHints {
        return super.renderHints.copyWith({
            editType: RenderHintsEditType.InputLike,
            dataType: RenderHintsDataType.XML
        });
    }
}
