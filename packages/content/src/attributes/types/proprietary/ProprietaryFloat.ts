import { serialize, type, validate } from "@js-soft/ts-serval";
import { characterSets } from "../../constants/CharacterSets";
import { ValueHints, ValueHintsOverride } from "../../hints";
import { AbstractFloat, AbstractFloatJSON, IAbstractFloat } from "../AbstractFloat";
import {
    IProprietaryAttributeValue,
    PROPRIETARY_ATTRIBUTE_MAX_DESCRIPTION_LENGTH,
    PROPRIETARY_ATTRIBUTE_MAX_TITLE_LENGTH,
    ProprietaryAttributeValueJSON
} from "./ProprietaryAttributeValue";

export interface ProprietaryFloatJSON extends ProprietaryAttributeValueJSON, AbstractFloatJSON {
    "@type": "ProprietaryFloat";
}

export interface IProprietaryFloat extends IProprietaryAttributeValue, IAbstractFloat {}

@type("ProprietaryFloat")
export class ProprietaryFloat extends AbstractFloat {
    @serialize()
    @validate({ max: PROPRIETARY_ATTRIBUTE_MAX_TITLE_LENGTH, regExp: characterSets.din91379DatatypeC })
    public title: string;

    @serialize()
    @validate({ nullable: true, max: PROPRIETARY_ATTRIBUTE_MAX_DESCRIPTION_LENGTH, regExp: characterSets.din91379DatatypeC })
    public description?: string;

    @serialize()
    @validate({ nullable: true })
    public valueHintsOverride?: ValueHintsOverride;

    public static from(value: IProprietaryFloat | Omit<ProprietaryFloatJSON, "@type">): ProprietaryFloat {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): ProprietaryFloatJSON {
        return super.toJSON(verbose, serializeAsString) as ProprietaryFloatJSON;
    }

    public override get valueHints(): ValueHints {
        return super.valueHints.copyWith(this.valueHintsOverride?.toJSON());
    }
}
