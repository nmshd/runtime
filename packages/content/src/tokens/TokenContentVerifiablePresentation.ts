import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { PROPRIETARY_ATTRIBUTE_MAX_DESCRIPTION_LENGTH } from "../attributes/types/proprietary/ProprietaryAttributeValue";

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

    public static from(value: ITokenContentVerifiablePresentation): TokenContentVerifiablePresentation {
        return this.fromAny(value);
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
