import { serialize, type, validate } from "@js-soft/ts-serval";
import { AbstractStringJSON, IAbstractString } from "../AbstractString.js";
import { AbstractXML } from "../strings/AbstractXML.js";

export interface SchematizedXMLJSON extends AbstractStringJSON {
    "@type": "SchematizedXML";
    schemaURL?: string;
}

export interface ISchematizedXML extends IAbstractString {
    schemaURL?: string;
}

@type("SchematizedXML")
export class SchematizedXML extends AbstractXML implements ISchematizedXML {
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

    public static from(value: SchematizedXML | Omit<SchematizedXML, "@type"> | string): SchematizedXML {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): SchematizedXML {
        return super.toJSON(verbose, serializeAsString) as SchematizedXML;
    }
}
