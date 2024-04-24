import { serialize, validate } from "@js-soft/ts-serval";
import { RenderHints, RenderHintsDataType, RenderHintsEditType, ValueHints } from "../../hints";
import { AbstractString } from "../AbstractString";

export abstract class AbstractHouseNumber extends AbstractString {
    @serialize()
    @validate({
        min: 0,
        max: 100,
        regExp: new RegExp(
            /^(?:|[1-9][0-9]{0,}(?:[ ]?[/-][ ]?(?:[1-9][0-9]{0,}))?|[1-9][0-9]{0,}(?:[ ][1-9][/][1-9][0-9]{0,})(?:[ ][A-Z]){0,}|[1-9][0-9]{0,}(?:[ ]?[A-Z](?:[ ][1-9][0-9]{0,}){0,1}){0,1}|(?:[1-9][0-9]{0,}[ ]?bis)|(?:[1-9][0-9]{0,}[ ]?ter)|(?:[1-9][0-9]{0,}[ ]?quater))$/,
            "i"
        )
    })
    public override value: string;

    public static override get valueHints(): ValueHints {
        return super.valueHints.copyWith({
            min: 0,
            max: 20,
            pattern:
                "^(?:|[1-9][0-9]{0,}(?:[ ]?[/-][ ]?(?:[1-9][0-9]{0,}))?|[1-9][0-9]{0,}(?:[ ][1-9][/][1-9][0-9]{0,})(?:[ ][A-Z]){0,}|[1-9][0-9]{0,}(?:[ ]?[A-Z](?:[ ][1-9][0-9]{0,}){0,1}){0,1}|(?:[1-9][0-9]{0,}[ ]?bis)|(?:[1-9][0-9]{0,}[ ]?ter)|(?:[1-9][0-9]{0,}[ ]?quater))$/i"
        });
    }

    public static override get renderHints(): RenderHints {
        return super.renderHints.copyWith({
            editType: RenderHintsEditType.InputLike,
            dataType: RenderHintsDataType.HouseNumber
        });
    }
}
