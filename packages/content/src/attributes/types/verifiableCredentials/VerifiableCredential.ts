import { serialize, type, validate } from "@js-soft/ts-serval";
import type { OpenId4VcDisplayInformation, OpenId4VcJsonObject } from "../../../openid4vc/OpenId4Vc";
import { AbstractAttributeValue, AbstractAttributeValueJSON, IAbstractAttributeValue } from "../../AbstractAttributeValue";
import { RenderHints, RenderHintsEditType, RenderHintsTechnicalType, ValueHints } from "../../hints";
import { PROPRIETARY_ATTRIBUTE_MAX_DESCRIPTION_LENGTH } from "../proprietary";
import { DisplayInformationCachedImages, DisplayInformationCachedImagesJSON, IDisplayInformationCachedImages } from "./DisplayInformationCachedImages";

export interface VerifiableCredentialJSON extends AbstractAttributeValueJSON {
    "@type": "VerifiableCredential";
    value: string | OpenId4VcJsonObject;
    type: string;
    displayInformation?: OpenId4VcDisplayInformation[];
    displayInformationCachedImages?: DisplayInformationCachedImagesJSON[];
}

export interface IVerifiableCredential extends IAbstractAttributeValue {
    value: string | OpenId4VcJsonObject;
    type: string;
    displayInformation?: OpenId4VcDisplayInformation[];
    displayInformationCachedImages?: IDisplayInformationCachedImages[];
}

@type("VerifiableCredential")
export class VerifiableCredential extends AbstractAttributeValue implements IVerifiableCredential {
    @serialize({ any: true })
    @validate({ customValidator: validateValue })
    public value: string | OpenId4VcJsonObject;

    @serialize()
    @validate({ nullable: true })
    public type: string;

    // Keep typed protocol JSON as plain data instead of SerVal JSONWrapper instances.
    @serialize({ any: true })
    @validate({ nullable: true, max: PROPRIETARY_ATTRIBUTE_MAX_DESCRIPTION_LENGTH })
    public displayInformation?: OpenId4VcDisplayInformation[];

    @serialize()
    @validate({ nullable: true })
    public displayInformationCachedImages?: DisplayInformationCachedImages[];

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

function validateValue(value: unknown) {
    try {
        const string: unknown = JSON.stringify(value);
        // the length corresponds to 50MB - maybe this needs to be restricted further in the future
        if (typeof string !== "string") return "must be a valid JSON object";
        if (string.length > 52428800) {
            return "stringified value must not be longer than 52428800 characters";
        }
    } catch (e) {
        if (e instanceof SyntaxError || e instanceof TypeError) {
            return "must be a valid JSON object";
        }

        return "could not validate value";
    }

    return undefined;
}
