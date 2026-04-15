import { serialize, type, validate } from "@js-soft/ts-serval";
import { AbstractAttributeValue, AbstractAttributeValueJSON, IAbstractAttributeValue } from "../../AbstractAttributeValue";

export interface SchematizedJSONJSON extends AbstractAttributeValueJSON {
    "@type": "SchematizedJSON";
    value: unknown;
    schemaURL?: string;
}

export interface ISchematizedJSON extends IAbstractAttributeValue {
    value: unknown;
    schemaURL?: string;
}

@type("SchematizedJSON")
export class SchematizedJSON extends AbstractAttributeValue implements ISchematizedJSON {
    @serialize({ any: true })
    @validate({ customValidator: validateValue })
    public value: unknown;

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

    public static from(value: ISchematizedJSON | Omit<SchematizedJSONJSON, "@type">): SchematizedJSON {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): SchematizedJSONJSON {
        return super.toJSON(verbose, serializeAsString) as SchematizedJSONJSON;
    }
}

function validateValue(value: any) {
    try {
        const string = JSON.stringify(value);
        if (string.length > 4096) {
            return "stringified value must not be longer than 4096 characters";
        }
    } catch (e) {
        if (e instanceof SyntaxError) {
            return "must be a valid JSON object";
        }

        return "could not validate value";
    }

    return undefined;
}
