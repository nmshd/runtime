import { serialize, type, validate } from "@js-soft/ts-serval";
import { AbstractAttributeValue } from "../AbstractAttributeValue";
import { RenderHints, RenderHintsEditType, RenderHintsTechnicalType, ValueHints } from "../hints";
import { PROPRIETARY_ATTRIBUTE_MAX_DESCRIPTION_LENGTH } from "./proprietary/ProprietaryAttributeValue";
import { IVerifiableCredential, validateValue, VerifiableCredentialJSON } from "./VerifiableCredential";

export interface VerifiablePresentationJSON extends Omit<VerifiableCredentialJSON, "@type"> {
    "@type": "VerifiablePresentation";
}

export interface IVerifiablePresentation extends IVerifiableCredential {}

@type("VerifiablePresentation")
export class VerifiablePresentation extends AbstractAttributeValue implements IVerifiablePresentation {
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

    public static from(value: IVerifiablePresentation | Omit<VerifiablePresentationJSON, "@type">): VerifiablePresentation {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): VerifiablePresentationJSON {
        return super.toJSON(verbose, serializeAsString) as VerifiablePresentationJSON;
    }
}
