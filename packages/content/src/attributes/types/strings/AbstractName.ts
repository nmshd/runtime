import { serialize, validate } from "@js-soft/ts-serval";
import { characterSets } from "../../constants/CharacterSets";
import { ValueHints } from "../../hints";
import { AbstractString } from "../AbstractString";

export abstract class AbstractName extends AbstractString {
    @serialize()
    @validate({
        max: 100,
        regExp: characterSets.din91379DatatypeB
    })
    public override value: string;

    public static override get valueHints(): ValueHints {
        return super.valueHints.copyWith({
            max: 100,
            pattern: characterSets.din91379DatatypeB.toString().slice(1, -1).replaceAll("/", "\\/")
        });
    }
}
