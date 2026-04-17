import { serialize, type, validate } from "@js-soft/ts-serval";
import { AbstractAttributeValue, AbstractAttributeValueJSON, IAbstractAttributeValue } from "../../AbstractAttributeValue";
import { RenderHints, RenderHintsEditType, RenderHintsTechnicalType, ValueHints } from "../../hints";
import { validateJSON } from "../utils";
import { PROPRIETARY_ATTRIBUTE_MAX_DESCRIPTION_LENGTH, PROPRIETARY_ATTRIBUTE_MAX_TITLE_LENGTH } from "./ProprietaryAttributeValue";

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
    @validate({ customValidator: validateJSON })
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
