import { serialize, type, validate } from "@js-soft/ts-serval";
import { ValueHints, ValueHintsOverride } from "../../hints/index.js";
import { AbstractStringJSON, IAbstractString } from "../AbstractString.js";
import { AbstractHEXColor } from "../strings/AbstractHEXColor.js";
import {
    IProprietaryAttributeValue,
    PROPRIETARY_ATTRIBUTE_MAX_DESCRIPTION_LENGTH,
    PROPRIETARY_ATTRIBUTE_MAX_TITLE_LENGTH,
    ProprietaryAttributeValueJSON
} from "./ProprietaryAttributeValue.js";

export interface ProprietaryHEXColorJSON extends ProprietaryAttributeValueJSON, AbstractStringJSON {
    "@type": "ProprietaryHEXColor";
}

export interface IProprietaryHEXColor extends IProprietaryAttributeValue, IAbstractString {}

@type("ProprietaryHEXColor")
export class ProprietaryHEXColor extends AbstractHEXColor {
    @serialize()
    @validate({ max: PROPRIETARY_ATTRIBUTE_MAX_TITLE_LENGTH })
    public title: string;

    @serialize()
    @validate({ nullable: true, max: PROPRIETARY_ATTRIBUTE_MAX_DESCRIPTION_LENGTH })
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
