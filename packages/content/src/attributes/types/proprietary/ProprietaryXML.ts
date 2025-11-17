import { serialize, type, validate } from "@js-soft/ts-serval";
import { ValueHints, ValueHintsOverride } from "../../hints/index.js";
import { AbstractStringJSON, IAbstractString } from "../AbstractString.js";
import { AbstractXML } from "../strings/AbstractXML.js";
import {
    IProprietaryAttributeValue,
    PROPRIETARY_ATTRIBUTE_MAX_DESCRIPTION_LENGTH,
    PROPRIETARY_ATTRIBUTE_MAX_TITLE_LENGTH,
    ProprietaryAttributeValueJSON
} from "./ProprietaryAttributeValue.js";

export interface ProprietaryXMLJSON extends ProprietaryAttributeValueJSON, AbstractStringJSON {
    "@type": "ProprietaryXML";
    schemaURL?: string;
}

export interface IProprietaryXML extends IProprietaryAttributeValue, IAbstractString {
    schemaURL?: string;
}

@type("ProprietaryXML")
export class ProprietaryXML extends AbstractXML {
    @serialize()
    @validate({ max: PROPRIETARY_ATTRIBUTE_MAX_TITLE_LENGTH })
    public title: string;

    @serialize()
    @validate({ nullable: true, max: PROPRIETARY_ATTRIBUTE_MAX_DESCRIPTION_LENGTH })
    public description?: string;

    @serialize()
    @validate({
        nullable: true,
        min: 3,
        max: 1024,
        regExp: new RegExp(
            "^((([A-Za-z]{3,9}:(?:\\/\\/)?)(?:[-;:&=+$,\\w]+@)?[A-Za-z0-9.-]+|(?:www\\.|[-;:&=+$,\\w]+@)[A-Za-z0-9.-]+)((?:\\/[+~%/\\\\.\\w\\-_]*)?\\??(?:[-+=&;%@.\\w_]*)#?(?:[.!/\\\\\\w]*))?)$"
        )
    })
    public schemaURL?: string;

    @serialize()
    @validate({ nullable: true })
    public valueHintsOverride?: ValueHintsOverride;

    public static from(value: IProprietaryXML | Omit<ProprietaryXMLJSON, "@type">): ProprietaryXML {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): ProprietaryXMLJSON {
        return super.toJSON(verbose, serializeAsString) as ProprietaryXMLJSON;
    }

    public override get valueHints(): ValueHints {
        return super.valueHints.copyWith(this.valueHintsOverride?.toJSON());
    }
}
