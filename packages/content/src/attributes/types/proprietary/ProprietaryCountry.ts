import { serialize, type, validate } from "@js-soft/ts-serval";
import { ValueHints, ValueHintsOverride } from "../../hints/index.js";
import { AbstractStringJSON, IAbstractString } from "../AbstractString.js";
import { AbstractCountry } from "../strings/AbstractCountry.js";
import {
    IProprietaryAttributeValue,
    PROPRIETARY_ATTRIBUTE_MAX_DESCRIPTION_LENGTH,
    PROPRIETARY_ATTRIBUTE_MAX_TITLE_LENGTH,
    ProprietaryAttributeValueJSON
} from "./ProprietaryAttributeValue.js";

export interface ProprietaryCountryJSON extends ProprietaryAttributeValueJSON, AbstractStringJSON {
    "@type": "ProprietaryCountry";
}

export interface IProprietaryCountry extends IProprietaryAttributeValue, IAbstractString {}

@type("ProprietaryCountry")
export class ProprietaryCountry extends AbstractCountry {
    @serialize()
    @validate({ max: PROPRIETARY_ATTRIBUTE_MAX_TITLE_LENGTH })
    public title: string;

    @serialize()
    @validate({ nullable: true, max: PROPRIETARY_ATTRIBUTE_MAX_DESCRIPTION_LENGTH })
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
