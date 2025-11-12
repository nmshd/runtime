import { serialize, type, validate } from "@js-soft/ts-serval";
import { RenderHints, RenderHintsEditType, ValueHints, ValueHintsValue } from "../../../attributes/hints/index.js";
import { AbstractString, AbstractStringJSON, IAbstractString } from "../AbstractString.js";

/**
 * Biologisches Geschlecht
 */
export enum BiologicalSex {
    X = "intersex",
    F = "female",
    M = "male"
}

export interface SexJSON extends AbstractStringJSON {
    "@type": "Sex";
}

export interface ISex extends IAbstractString {}

@type("Sex")
export class Sex extends AbstractString {
    @serialize()
    @validate({
        customValidator: (v) => (!Object.values(BiologicalSex).includes(v) ? `must be one of: ${Object.values(BiologicalSex)}` : undefined)
    })
    public override value: BiologicalSex;

    public static override get valueHints(): ValueHints {
        return super.valueHints.copyWith({
            values: Object.values(BiologicalSex).map((value) => ValueHintsValue.from({ key: value, displayName: `i18n://attributes.values.sex.${value}` }))
        });
    }

    public static override get renderHints(): RenderHints {
        return super.renderHints.copyWith({
            editType: RenderHintsEditType.ButtonLike
        });
    }

    public static from(value: ISex | Omit<SexJSON, "@type"> | string): Sex {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): SexJSON {
        return super.toJSON(verbose, serializeAsString) as SexJSON;
    }
}
