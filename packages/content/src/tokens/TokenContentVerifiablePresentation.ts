import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { ContentJSON } from "../ContentJSON";
import type { OpenId4VcDisplayInformation, OpenId4VcJsonObject } from "../openid4vc/OpenId4Vc";
import { PROPRIETARY_ATTRIBUTE_MAX_DESCRIPTION_LENGTH } from "../attributes";

export interface TokenContentVerifiablePresentationJSON extends ContentJSON {
    "@type": "TokenContentVerifiablePresentation";
    value: string | OpenId4VcJsonObject;
    type: string;
    displayInformation?: OpenId4VcDisplayInformation[];
}

export interface ITokenContentVerifiablePresentation extends ISerializable {
    value: string | OpenId4VcJsonObject;
    type: string;
    displayInformation?: OpenId4VcDisplayInformation[];
}

@type("TokenContentVerifiablePresentation")
export class TokenContentVerifiablePresentation extends Serializable implements ITokenContentVerifiablePresentation {
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

    public static from(value: ITokenContentVerifiablePresentation | Omit<TokenContentVerifiablePresentationJSON, "@type">): TokenContentVerifiablePresentation {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): TokenContentVerifiablePresentationJSON {
        return super.toJSON(verbose, serializeAsString) as TokenContentVerifiablePresentationJSON;
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
