import { serialize, type, validate } from "@js-soft/ts-serval";
import { characterSets } from "../../constants/CharacterSets";
import { ValueHints, ValueHintsOverride } from "../../hints";
import { AbstractStringJSON, IAbstractString } from "../AbstractString";
import { AbstractEMailAddress } from "../strings/AbstractEMailAddress";
import {
    IProprietaryAttributeValue,
    PROPRIETARY_ATTRIBUTE_MAX_DESCRIPTION_LENGTH,
    PROPRIETARY_ATTRIBUTE_MAX_TITLE_LENGTH,
    ProprietaryAttributeValueJSON
} from "./ProprietaryAttributeValue";

export interface ProprietaryEMailAddressJSON extends ProprietaryAttributeValueJSON, AbstractStringJSON {
    "@type": "ProprietaryEMailAddress";
}

export interface IProprietaryEMailAddress extends IProprietaryAttributeValue, IAbstractString {}

@type("ProprietaryEMailAddress")
export class ProprietaryEMailAddress extends AbstractEMailAddress {
    @serialize()
    @validate({ max: PROPRIETARY_ATTRIBUTE_MAX_TITLE_LENGTH, regExp: characterSets.din91379DatatypeC })
    public title: string;

    @serialize()
    @validate({ nullable: true, max: PROPRIETARY_ATTRIBUTE_MAX_DESCRIPTION_LENGTH, regExp: characterSets.din91379DatatypeC })
    public description?: string;

    @serialize()
    @validate({ nullable: true })
    public valueHintsOverride?: ValueHintsOverride;

    public static from(value: IProprietaryEMailAddress | Omit<ProprietaryEMailAddressJSON, "@type">): ProprietaryEMailAddress {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): ProprietaryEMailAddressJSON {
        return super.toJSON(verbose, serializeAsString) as ProprietaryEMailAddressJSON;
    }

    public override get valueHints(): ValueHints {
        return super.valueHints.copyWith(this.valueHintsOverride?.toJSON());
    }
}
