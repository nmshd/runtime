import { PrimitiveType, Serializable, serialize, type, validate, ValidationError } from "@js-soft/ts-serval";
import { nameof } from "ts-simple-nameof";
import { AcceptRequestItemParametersJSON } from "../../incoming/decide/AcceptRequestItemParameters";

export interface AcceptFormFieldRequestItemParametersJSON extends AcceptRequestItemParametersJSON {
    response: string | number | boolean | string[];
}

@type("AcceptFormFieldRequestItemParameters")
export class AcceptFormFieldRequestItemParameters extends Serializable {
    @serialize({ any: true })
    @validate({ allowedTypes: [PrimitiveType.String, PrimitiveType.Number, PrimitiveType.Boolean, PrimitiveType.Array] })
    public response: string | number | boolean | string[];

    public static from(value: AcceptFormFieldRequestItemParametersJSON): AcceptFormFieldRequestItemParameters {
        return this.fromAny(value);
    }

    protected static override postFrom<T extends Serializable>(value: T): T {
        if (!(value instanceof AcceptFormFieldRequestItemParameters)) {
            throw new Error("this should never happen");
        }

        if (Array.isArray(value.response) && !value.response.every((option) => typeof option === "string")) {
            throw new ValidationError(
                AcceptFormFieldRequestItemParameters.name,
                nameof<AcceptFormFieldRequestItemParameters>((x) => x.response),
                `If the ${nameof<AcceptFormFieldRequestItemParameters>((x) => x.response)} is an array, it must be a string array.`
            );
        }

        return value;
    }
}
