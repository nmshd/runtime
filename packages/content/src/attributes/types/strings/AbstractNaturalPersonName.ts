import { serialize, validate } from "@js-soft/ts-serval";
import { ValueHints } from "../../../attributes/hints";
import { characterSets } from "../../constants/CharacterSets";
import { AbstractString } from "../AbstractString";

export abstract class AbstractNaturalPersonName extends AbstractString {
    @serialize()
    @validate({
        max: 100,
        regExp: characterSets.din91379DatatypeA
    })
    public override value: string;

    public static override get valueHints(): ValueHints {
        return super.valueHints.copyWith({
            max: 100,
            pattern: characterSets.din91379DatatypeA.toString().slice(1, -1).replaceAll("/", "\\/")
        });
    }
}
