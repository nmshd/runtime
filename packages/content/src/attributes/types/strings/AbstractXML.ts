import { serialize, validate } from "@js-soft/ts-serval";
import { RenderHints, RenderHintsDataType, RenderHintsEditType, ValueHints } from "../../../attributes/hints";
import { characterSets } from "../../constants/CharacterSets";
import { AbstractString } from "../AbstractString";

export abstract class AbstractXML extends AbstractString {
    @serialize()
    @validate({ max: 50000, regExp: characterSets.din91379DatatypeC })
    public override value: string;

    public static override get valueHints(): ValueHints {
        return ValueHints.from({
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
