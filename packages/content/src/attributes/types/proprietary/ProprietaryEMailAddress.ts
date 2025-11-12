import { serialize, type, validate } from "@js-soft/ts-serval";
import { ValueHints, ValueHintsOverride } from "../../hints/index.js";
import { AbstractStringJSON, IAbstractString } from "../AbstractString.js";
import { AbstractEMailAddress } from "../strings/AbstractEMailAddress.js";
import {
    IProprietaryAttributeValue,
    PROPRIETARY_ATTRIBUTE_MAX_DESCRIPTION_LENGTH,
    PROPRIETARY_ATTRIBUTE_MAX_TITLE_LENGTH,
    ProprietaryAttributeValueJSON
} from "./ProprietaryAttributeValue.js";

export interface ProprietaryEMailAddressJSON extends ProprietaryAttributeValueJSON, AbstractStringJSON {
    "@type": "ProprietaryEMailAddress";
}

export interface IProprietaryEMailAddress extends IProprietaryAttributeValue, IAbstractString {}

@type("ProprietaryEMailAddress")
export class ProprietaryEMailAddress extends AbstractEMailAddress {
    @serialize()
    @validate({ max: PROPRIETARY_ATTRIBUTE_MAX_TITLE_LENGTH })
    public title: string;

    @serialize()
    @validate({ nullable: true, max: PROPRIETARY_ATTRIBUTE_MAX_DESCRIPTION_LENGTH })
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
