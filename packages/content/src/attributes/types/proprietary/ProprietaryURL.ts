import { serialize, type, validate } from "@js-soft/ts-serval";
import { ValueHints, ValueHintsOverride } from "../../hints/index.js";
import { AbstractStringJSON, IAbstractString } from "../AbstractString.js";
import { AbstractURL } from "../strings/AbstractURL.js";
import {
    IProprietaryAttributeValue,
    PROPRIETARY_ATTRIBUTE_MAX_DESCRIPTION_LENGTH,
    PROPRIETARY_ATTRIBUTE_MAX_TITLE_LENGTH,
    ProprietaryAttributeValueJSON
} from "./ProprietaryAttributeValue.js";

export interface ProprietaryURLJSON extends ProprietaryAttributeValueJSON, AbstractStringJSON {
    "@type": "ProprietaryURL";
}

export interface IProprietaryURL extends IProprietaryAttributeValue, IAbstractString {}

@type("ProprietaryURL")
export class ProprietaryURL extends AbstractURL {
    @serialize()
    @validate({ max: PROPRIETARY_ATTRIBUTE_MAX_TITLE_LENGTH })
    public title: string;

    @serialize()
    @validate({ nullable: true, max: PROPRIETARY_ATTRIBUTE_MAX_DESCRIPTION_LENGTH })
    public description?: string;

    @serialize()
    @validate({ nullable: true })
    public valueHintsOverride?: ValueHintsOverride;

    public static from(value: IProprietaryURL | Omit<ProprietaryURLJSON, "@type">): ProprietaryURL {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): ProprietaryURLJSON {
        return super.toJSON(verbose, serializeAsString) as ProprietaryURLJSON;
    }

    public override get valueHints(): ValueHints {
        return super.valueHints.copyWith(this.valueHintsOverride?.toJSON());
    }
}
