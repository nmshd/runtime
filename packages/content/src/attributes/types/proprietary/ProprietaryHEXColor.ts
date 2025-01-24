import { serialize, type, validate } from "@js-soft/ts-serval";
import { characterSets } from "../../constants/CharacterSets";
import { ValueHints, ValueHintsOverride } from "../../hints";
import { AbstractStringJSON, IAbstractString } from "../AbstractString";
import { AbstractHEXColor } from "../strings/AbstractHEXColor";
import {
    IProprietaryAttributeValue,
    PROPRIETARY_ATTRIBUTE_MAX_DESCRIPTION_LENGTH,
    PROPRIETARY_ATTRIBUTE_MAX_TITLE_LENGTH,
    ProprietaryAttributeValueJSON
} from "./ProprietaryAttributeValue";

export interface ProprietaryHEXColorJSON extends ProprietaryAttributeValueJSON, AbstractStringJSON {
    "@type": "ProprietaryHEXColor";
}

export interface IProprietaryHEXColor extends IProprietaryAttributeValue, IAbstractString {}

@type("ProprietaryHEXColor")
export class ProprietaryHEXColor extends AbstractHEXColor {
    @serialize()
    @validate({ max: PROPRIETARY_ATTRIBUTE_MAX_TITLE_LENGTH, regExp: characterSets.din91379DatatypeC })
    public title: string;

    @serialize()
    @validate({ nullable: true, max: PROPRIETARY_ATTRIBUTE_MAX_DESCRIPTION_LENGTH, regExp: characterSets.din91379DatatypeC })
    public description?: string;

    @serialize()
    @validate({ nullable: true })
    public valueHintsOverride?: ValueHintsOverride;

    public static from(value: IProprietaryHEXColor | Omit<ProprietaryHEXColorJSON, "@type">): ProprietaryHEXColor {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): ProprietaryHEXColorJSON {
        return super.toJSON(verbose, serializeAsString) as ProprietaryHEXColorJSON;
    }

    public override get valueHints(): ValueHints {
        return super.valueHints.copyWith(this.valueHintsOverride?.toJSON());
    }
}
