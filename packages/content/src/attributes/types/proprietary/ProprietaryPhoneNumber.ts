import { serialize, type, validate } from "@js-soft/ts-serval";
import { ValueHints, ValueHintsOverride } from "../../hints/index.js";
import { AbstractStringJSON, IAbstractString } from "../AbstractString.js";
import { AbstractPhoneNumber } from "../strings/AbstractPhoneNumber.js";
import {
    IProprietaryAttributeValue,
    PROPRIETARY_ATTRIBUTE_MAX_DESCRIPTION_LENGTH,
    PROPRIETARY_ATTRIBUTE_MAX_TITLE_LENGTH,
    ProprietaryAttributeValueJSON
} from "./ProprietaryAttributeValue.js";

export interface ProprietaryPhoneNumberJSON extends ProprietaryAttributeValueJSON, AbstractStringJSON {
    "@type": "ProprietaryPhoneNumber";
}

export interface IProprietaryPhoneNumber extends IProprietaryAttributeValue, IAbstractString {}

@type("ProprietaryPhoneNumber")
export class ProprietaryPhoneNumber extends AbstractPhoneNumber {
    @serialize()
    @validate({ max: PROPRIETARY_ATTRIBUTE_MAX_TITLE_LENGTH })
    public title: string;

    @serialize()
    @validate({ nullable: true, max: PROPRIETARY_ATTRIBUTE_MAX_DESCRIPTION_LENGTH })
    public description?: string;

    @serialize()
    @validate({ nullable: true })
    public valueHintsOverride?: ValueHintsOverride;

    public static from(value: IProprietaryPhoneNumber | Omit<ProprietaryPhoneNumberJSON, "@type">): ProprietaryPhoneNumber {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): ProprietaryPhoneNumberJSON {
        return super.toJSON(verbose, serializeAsString) as ProprietaryPhoneNumberJSON;
    }

    public override get valueHints(): ValueHints {
        return super.valueHints.copyWith(this.valueHintsOverride?.toJSON());
    }
}
