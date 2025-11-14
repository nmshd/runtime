import { serialize, type, validate } from "@js-soft/ts-serval";
import { ValueHints, ValueHintsOverride } from "../../hints/index.js";
import { AbstractInteger, AbstractIntegerJSON, IAbstractInteger } from "../AbstractInteger.js";
import {
    IProprietaryAttributeValue,
    PROPRIETARY_ATTRIBUTE_MAX_DESCRIPTION_LENGTH,
    PROPRIETARY_ATTRIBUTE_MAX_TITLE_LENGTH,
    ProprietaryAttributeValueJSON
} from "./ProprietaryAttributeValue.js";

export interface ProprietaryIntegerJSON extends ProprietaryAttributeValueJSON, AbstractIntegerJSON {
    "@type": "ProprietaryInteger";
}

export interface IProprietaryInteger extends IProprietaryAttributeValue, IAbstractInteger {}

@type("ProprietaryInteger")
export class ProprietaryInteger extends AbstractInteger implements IProprietaryInteger {
    @serialize()
    @validate({ max: PROPRIETARY_ATTRIBUTE_MAX_TITLE_LENGTH })
    public title: string;

    @serialize()
    @validate({ nullable: true, max: PROPRIETARY_ATTRIBUTE_MAX_DESCRIPTION_LENGTH })
    public description?: string;

    @serialize()
    @validate({ nullable: true })
    public valueHintsOverride?: ValueHintsOverride;

    public static from(value: IProprietaryInteger | Omit<ProprietaryIntegerJSON, "@type"> | number): ProprietaryInteger {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): ProprietaryIntegerJSON {
        return super.toJSON(verbose, serializeAsString) as ProprietaryIntegerJSON;
    }

    public override get valueHints(): ValueHints {
        return super.valueHints.copyWith(this.valueHintsOverride?.toJSON());
    }
}
