import { serialize, type, validate } from "@js-soft/ts-serval";
import { AbstractAttributeValue, AbstractAttributeValueJSON, IAbstractAttributeValue } from "../../AbstractAttributeValue";
import { RenderHints, RenderHintsEditType, RenderHintsTechnicalType, ValueHints } from "../../hints";
import { validateJSON } from "../utils";

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
    @validate({ customValidator: validateJSON })
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

    public static get valueHints(): ValueHints {
        return ValueHints.from({});
    }

    public static get renderHints(): RenderHints {
        return RenderHints.from({
            editType: RenderHintsEditType.TextArea,
            technicalType: RenderHintsTechnicalType.Unknown
        });
    }

    public static from(value: ISchematizedJSON | Omit<SchematizedJSONJSON, "@type">): SchematizedJSON {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): SchematizedJSONJSON {
        return super.toJSON(verbose, serializeAsString) as SchematizedJSONJSON;
    }
}
