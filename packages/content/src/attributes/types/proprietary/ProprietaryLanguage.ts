import { serialize, type, validate } from "@js-soft/ts-serval";
import { characterSets } from "../../constants/CharacterSets";
import { ValueHints, ValueHintsOverride } from "../../hints";
import { AbstractStringJSON, IAbstractString } from "../AbstractString";
import { AbstractLanguage } from "../strings/AbstractLanguage";
import {
    IProprietaryAttributeValue,
    PROPRIETARY_ATTRIBUTE_MAX_DESCRIPTION_LENGTH,
    PROPRIETARY_ATTRIBUTE_MAX_TITLE_LENGTH,
    ProprietaryAttributeValueJSON
} from "./ProprietaryAttributeValue";

export interface ProprietaryLanguageJSON extends ProprietaryAttributeValueJSON, AbstractStringJSON {
    "@type": "ProprietaryLanguage";
}

export interface IProprietaryLanguage extends IProprietaryAttributeValue, IAbstractString {}

@type("ProprietaryLanguage")
export class ProprietaryLanguage extends AbstractLanguage {
    @serialize()
    @validate({ max: PROPRIETARY_ATTRIBUTE_MAX_TITLE_LENGTH, regExp: characterSets.din91379DatatypeC })
    public title: string;

    @serialize()
    @validate({ nullable: true, max: PROPRIETARY_ATTRIBUTE_MAX_DESCRIPTION_LENGTH, regExp: characterSets.din91379DatatypeC })
    public description?: string;

    @serialize()
    @validate({ nullable: true })
    public valueHintsOverride?: ValueHintsOverride;

    public static from(value: IProprietaryLanguage | Omit<ProprietaryLanguageJSON, "@type">): ProprietaryLanguage {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): ProprietaryLanguageJSON {
        return super.toJSON(verbose, serializeAsString) as ProprietaryLanguageJSON;
    }

    public override get valueHints(): ValueHints {
        return super.valueHints.copyWith(this.valueHintsOverride?.toJSON());
    }
}
