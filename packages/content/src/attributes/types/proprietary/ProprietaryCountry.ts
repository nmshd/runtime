import { serialize, type, validate } from "@js-soft/ts-serval";
import { characterSets } from "../../constants/CharacterSets";
import { ValueHints, ValueHintsOverride } from "../../hints";
import { AbstractStringJSON, IAbstractString } from "../AbstractString";
import { AbstractCountry } from "../strings/AbstractCountry";
import {
    IProprietaryAttributeValue,
    PROPRIETARY_ATTRIBUTE_MAX_DESCRIPTION_LENGTH,
    PROPRIETARY_ATTRIBUTE_MAX_TITLE_LENGTH,
    ProprietaryAttributeValueJSON
} from "./ProprietaryAttributeValue";

export interface ProprietaryCountryJSON extends ProprietaryAttributeValueJSON, AbstractStringJSON {
    "@type": "ProprietaryCountry";
}

export interface IProprietaryCountry extends IProprietaryAttributeValue, IAbstractString {}

@type("ProprietaryCountry")
export class ProprietaryCountry extends AbstractCountry {
    @serialize()
    @validate({ max: PROPRIETARY_ATTRIBUTE_MAX_TITLE_LENGTH, regExp: characterSets.din91379DatatypeC })
    public title: string;

    @serialize()
    @validate({ nullable: true, max: PROPRIETARY_ATTRIBUTE_MAX_DESCRIPTION_LENGTH, regExp: characterSets.din91379DatatypeC })
    public description?: string;

    @serialize()
    @validate({ nullable: true })
    public valueHintsOverride?: ValueHintsOverride;

    public static from(value: IProprietaryCountry | Omit<ProprietaryCountryJSON, "@type">): ProprietaryCountry {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): ProprietaryCountryJSON {
        return super.toJSON(verbose, serializeAsString) as ProprietaryCountryJSON;
    }

    public override get valueHints(): ValueHints {
        return super.valueHints.copyWith(this.valueHintsOverride?.toJSON());
    }
}
