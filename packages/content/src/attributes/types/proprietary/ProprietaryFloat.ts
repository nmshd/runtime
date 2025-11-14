import { serialize, type, validate } from "@js-soft/ts-serval";
import { ValueHints, ValueHintsOverride } from "../../hints/index.js";
import { AbstractFloat, AbstractFloatJSON, IAbstractFloat } from "../AbstractFloat.js";
import {
    IProprietaryAttributeValue,
    PROPRIETARY_ATTRIBUTE_MAX_DESCRIPTION_LENGTH,
    PROPRIETARY_ATTRIBUTE_MAX_TITLE_LENGTH,
    ProprietaryAttributeValueJSON
} from "./ProprietaryAttributeValue.js";

export interface ProprietaryFloatJSON extends ProprietaryAttributeValueJSON, AbstractFloatJSON {
    "@type": "ProprietaryFloat";
}

export interface IProprietaryFloat extends IProprietaryAttributeValue, IAbstractFloat {}

@type("ProprietaryFloat")
export class ProprietaryFloat extends AbstractFloat {
    @serialize()
    @validate({ max: PROPRIETARY_ATTRIBUTE_MAX_TITLE_LENGTH })
    public title: string;

    @serialize()
    @validate({ nullable: true, max: PROPRIETARY_ATTRIBUTE_MAX_DESCRIPTION_LENGTH })
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
