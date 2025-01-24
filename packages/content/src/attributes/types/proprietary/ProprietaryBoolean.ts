import { serialize, type, validate } from "@js-soft/ts-serval";
import { characterSets } from "../../constants/CharacterSets";
import { ValueHints, ValueHintsOverride } from "../../hints";
import { AbstractBoolean, AbstractBooleanJSON, IAbstractBoolean } from "../AbstractBoolean";
import {
    IProprietaryAttributeValue,
    PROPRIETARY_ATTRIBUTE_MAX_DESCRIPTION_LENGTH,
    PROPRIETARY_ATTRIBUTE_MAX_TITLE_LENGTH,
    ProprietaryAttributeValueJSON
} from "./ProprietaryAttributeValue";

export interface ProprietaryBooleanJSON extends ProprietaryAttributeValueJSON, AbstractBooleanJSON {
    "@type": "ProprietaryBoolean";
}

export interface IProprietaryBoolean extends IProprietaryAttributeValue, IAbstractBoolean {}

@type("ProprietaryBoolean")
export class ProprietaryBoolean extends AbstractBoolean {
    @serialize()
    @validate({ max: PROPRIETARY_ATTRIBUTE_MAX_TITLE_LENGTH, regExp: characterSets.din91379DatatypeC })
    public title: string;

    @serialize()
    @validate({ nullable: true, max: PROPRIETARY_ATTRIBUTE_MAX_DESCRIPTION_LENGTH, regExp: characterSets.din91379DatatypeC })
    public description?: string;

    @serialize()
    @validate({ nullable: true })
    public valueHintsOverride?: ValueHintsOverride;

    public static from(value: IProprietaryBoolean | Omit<ProprietaryBooleanJSON, "@type">): ProprietaryBoolean {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): ProprietaryBooleanJSON {
        return super.toJSON(verbose, serializeAsString) as ProprietaryBooleanJSON;
    }

    public override get valueHints(): ValueHints {
        return super.valueHints.copyWith(this.valueHintsOverride?.toJSON());
    }
}
