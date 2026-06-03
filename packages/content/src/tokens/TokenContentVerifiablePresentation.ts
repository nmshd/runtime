import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { ContentJSON } from "../ContentJSON";
import { PROPRIETARY_ATTRIBUTE_MAX_DESCRIPTION_LENGTH } from "../attributes";

export interface TokenContentVerifiablePresentationJSON extends ContentJSON {
    "@type": "TokenContentVerifiablePresentation";
    value: string | Record<string, any>;
    type: string;
    displayInformation?: Record<string, any>[];
}

export interface ITokenContentVerifiablePresentation extends ISerializable {
    value: string | Record<string, any>;
    type: string;
    displayInformation?: Record<string, any>[];
}

@type("TokenContentVerifiablePresentation")
export class TokenContentVerifiablePresentation extends Serializable implements ITokenContentVerifiablePresentation {
    @serialize({ any: true })
    @validate({ customValidator: validateValue })
    public value: string | Record<string, any>;

    @serialize()
    @validate({ nullable: true })
    public type: string;

    @serialize()
    @validate({ nullable: true, max: PROPRIETARY_ATTRIBUTE_MAX_DESCRIPTION_LENGTH })
    public displayInformation?: Record<string, any>[];

    public static from(value: ITokenContentVerifiablePresentation | Omit<TokenContentVerifiablePresentationJSON, "@type">): TokenContentVerifiablePresentation {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): TokenContentVerifiablePresentationJSON {
        return super.toJSON(verbose, serializeAsString) as TokenContentVerifiablePresentationJSON;
    }
}

function validateValue(value: any) {
    try {
        const string = JSON.stringify(value);
        // the length corresponds to 50MB - maybe this needs to be restricted further in the future
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
