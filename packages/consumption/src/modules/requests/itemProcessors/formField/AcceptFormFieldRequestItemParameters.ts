import { Serializable, serialize, type, validate, ValidationError } from "@js-soft/ts-serval";
import { nameof } from "ts-simple-nameof";
import { ConsumptionError } from "../../../../consumption/ConsumptionError";
import { AcceptRequestItemParametersJSON } from "../../incoming/decide/AcceptRequestItemParameters";

export interface AcceptFormFieldRequestItemParametersJSON extends AcceptRequestItemParametersJSON {
    freeValue?: string;
    options?: string[];
}

@type("AcceptFormFieldRequestItemParameters")
export class AcceptFormFieldRequestItemParameters extends Serializable {
    @serialize()
    @validate({ nullable: true })
    public freeValue: string;

    @serialize()
    @validate({ nullable: true })
    public options: string[];

    public static from(value: AcceptFormFieldRequestItemParametersJSON): AcceptFormFieldRequestItemParameters {
        return this.fromAny(value);
    }

    protected static override postFrom<T extends Serializable>(value: T): T {
        if (!(value instanceof AcceptFormFieldRequestItemParameters)) {
            throw new ConsumptionError("this should never happen");
        }

        if (value.freeValue && Array.isArray(value.options)) {
            throw new ValidationError(
                AcceptFormFieldRequestItemParameters.name,
                nameof<AcceptFormFieldRequestItemParameters>((x) => x.options),
                `You cannot specify both ${nameof<AcceptFormFieldRequestItemParameters>((x) => x.options)} and ${nameof<AcceptFormFieldRequestItemParameters>((x) => x.freeValue)}.`
            );
        }

        if (!value.freeValue && !Array.isArray(value.options)) {
            throw new ValidationError(
                AcceptFormFieldRequestItemParameters.name,
                nameof<AcceptFormFieldRequestItemParameters>((x) => x.options),
                `You have to specify either ${nameof<AcceptFormFieldRequestItemParameters>(
                    (x) => x.options
                )} or ${nameof<AcceptFormFieldRequestItemParameters>((x) => x.freeValue)}.`
            );
        }

        return value;
    }
}
