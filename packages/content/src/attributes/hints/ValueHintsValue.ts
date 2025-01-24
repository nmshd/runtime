import { ISerializable, PrimitiveType, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { characterSets } from "../constants/CharacterSets";

export interface ValueHintsValueJSON {
    key: string | number | boolean;
    displayName: string;
}

export interface IValueHintsValue extends ISerializable {
    key: string | number | boolean;
    displayName: string;
}

@type("ValueHintsValue")
export class ValueHintsValue extends Serializable implements IValueHintsValue {
    @serialize()
    @validate({ max: 100, regExp: characterSets.din91379DatatypeC })
    public displayName: string;

    @validate({
        allowedTypes: [PrimitiveType.String, PrimitiveType.Number, PrimitiveType.Boolean],
        customValidator: ValueHintsValue.validateKey,
        regExp: characterSets.din91379DatatypeC
    })
    @serialize()
    public key: string | number | boolean;

    public static from(value: IValueHintsValue | Omit<ValueHintsValueJSON, "@type">): ValueHintsValue {
        return this.fromAny(value);
    }

    private static validateKey(key: string | number | boolean) {
        if (typeof key === "string" && key.length > 100) {
            return "The maximum length of a key is 200 characters.";
        }

        return undefined;
    }
}
