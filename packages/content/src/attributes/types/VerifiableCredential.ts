import { serialize, type, validate } from "@js-soft/ts-serval";
import { AbstractAttributeValue, AbstractAttributeValueJSON, IAbstractAttributeValue } from "../AbstractAttributeValue";
import { RenderHints, RenderHintsEditType, RenderHintsTechnicalType, ValueHints } from "../hints";
import { PROPRIETARY_ATTRIBUTE_MAX_DESCRIPTION_LENGTH } from "./proprietary/ProprietaryAttributeValue";

export interface VerifiableCredentialJSON extends AbstractAttributeValueJSON {
    "@type": "VerifiableCredential";
    value: string | Record<string, any>;
    type: string;
    displayInformation?: Record<string, any>[];
}

export interface IVerifiableCredential extends IAbstractAttributeValue {
    value: string | Record<string, any>;
    type: string;
    displayInformation?: Record<string, any>[];
}

@type("VerifiableCredential")
export class VerifiableCredential extends AbstractAttributeValue implements IVerifiableCredential {
    @serialize({ any: true })
    @validate({ customValidator: validateValue })
    public value: string | Record<string, any>;

    @serialize()
    @validate({ nullable: true })
    public type: string;

    @serialize()
    @validate({ nullable: true, max: PROPRIETARY_ATTRIBUTE_MAX_DESCRIPTION_LENGTH })
    public displayInformation?: Record<string, any>[];

    public static get valueHints(): ValueHints {
        return ValueHints.from({});
    }

    public static get renderHints(): RenderHints {
        return RenderHints.from({
            editType: RenderHintsEditType.TextArea,
            technicalType: RenderHintsTechnicalType.Unknown
        });
    }

    public static from(value: IVerifiableCredential | Omit<VerifiableCredentialJSON, "@type">): VerifiableCredential {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): VerifiableCredentialJSON {
        return super.toJSON(verbose, serializeAsString) as VerifiableCredentialJSON;
    }
}

function validateValue(value: any) {
    try {
        const string = JSON.stringify(value);
        // the length correspondes to 50MB - maybe this needs to be restricted further in the future
        if (string.length > 52428800) {
            return "stringified value must not be longer than 52428800 characters";
        }
    } catch (e) {
        if (e instanceof SyntaxError) {
            return "must be a valid JSON object";
        }

        return "could not validate value";
    }

    return undefined;
}
