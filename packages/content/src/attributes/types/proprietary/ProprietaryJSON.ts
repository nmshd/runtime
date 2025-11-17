import { serialize, type, validate } from "@js-soft/ts-serval";
import { AbstractAttributeValue, AbstractAttributeValueJSON, IAbstractAttributeValue } from "../../AbstractAttributeValue.js";
import { RenderHints, RenderHintsEditType, RenderHintsTechnicalType, ValueHints } from "../../hints/index.js";
import { PROPRIETARY_ATTRIBUTE_MAX_DESCRIPTION_LENGTH, PROPRIETARY_ATTRIBUTE_MAX_TITLE_LENGTH } from "./ProprietaryAttributeValue.js";

export interface ProprietaryJSONJSON extends AbstractAttributeValueJSON {
    "@type": "ProprietaryJSON";
    title: string;
    description?: string;
    value: unknown;
}

export interface IProprietaryJSON extends IAbstractAttributeValue {
    title: string;
    description?: string;
    value: unknown;
}

@type("ProprietaryJSON")
export class ProprietaryJSON extends AbstractAttributeValue {
    @serialize()
    @validate({ max: PROPRIETARY_ATTRIBUTE_MAX_TITLE_LENGTH })
    public title: string;

    @serialize()
    @validate({ nullable: true, max: PROPRIETARY_ATTRIBUTE_MAX_DESCRIPTION_LENGTH })
    public description?: string;

    @serialize({ any: true })
    @validate({ customValidator: validateValue })
    public value: unknown;

    public static get valueHints(): ValueHints {
        return ValueHints.from({});
    }

    public static get renderHints(): RenderHints {
        return RenderHints.from({
            editType: RenderHintsEditType.TextArea,
            technicalType: RenderHintsTechnicalType.Unknown
        });
    }

    public static from(value: IProprietaryJSON | Omit<ProprietaryJSONJSON, "@type">): ProprietaryJSON {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): ProprietaryJSONJSON {
        return super.toJSON(verbose, serializeAsString) as ProprietaryJSONJSON;
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
