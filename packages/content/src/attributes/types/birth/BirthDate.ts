import { Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { DateTime } from "luxon";
import { nameof } from "ts-simple-nameof";
import { ValidationErrorWithoutProperty } from "../../../ValidationErrorWithoutProperty.js";
import { AbstractAttributeValue } from "../../AbstractAttributeValue.js";
import { AbstractComplexValue, AbstractComplexValueJSON, IAbstractComplexValue } from "../../AbstractComplexValue.js";
import { RenderHints, ValueHints } from "../../hints/index.js";
import { BirthDay, IBirthDay } from "./BirthDay.js";
import { BirthMonth, IBirthMonth } from "./BirthMonth.js";
import { BirthYear, IBirthYear } from "./BirthYear.js";

export interface BirthDateJSON extends AbstractComplexValueJSON {
    "@type": "BirthDate";
    day: number;
    month: number;
    year: number;
}

export interface IBirthDate extends IAbstractComplexValue {
    day: IBirthDay | number;
    month: IBirthMonth | number;
    year: IBirthYear | number;
}

@type("BirthDate")
export class BirthDate extends AbstractComplexValue implements IBirthDate {
    @serialize({ customGenerator: AbstractAttributeValue.valueGenerator })
    @validate()
    public day: BirthDay;

    @serialize({ customGenerator: AbstractAttributeValue.valueGenerator })
    @validate()
    public month: BirthMonth;

    @serialize({ customGenerator: AbstractAttributeValue.valueGenerator })
    @validate()
    public year: BirthYear;

    protected static override postFrom<T extends Serializable>(value: T): T {
        if (!(value instanceof BirthDate)) throw new Error("this should never happen");

        const dateTime = DateTime.fromObject({ day: value.day.value, month: value.month.value, year: value.year.value });
        const isValid = dateTime.isValid;

        if (!isValid) {
            throw new ValidationErrorWithoutProperty(BirthDate.name, "The BirthDate is not a valid date.");
        }

        if (DateTime.utc() < dateTime) {
            throw new ValidationErrorWithoutProperty(BirthDate.name, "You cannot enter a BirthDate that is in the future.");
        }

        return value;
    }

    public static get valueHints(): ValueHints {
        return ValueHints.from({
            propertyHints: {
                [nameof<BirthDate>((b) => b.day)]: BirthDay.valueHints,
                [nameof<BirthDate>((b) => b.month)]: BirthMonth.valueHints,
                [nameof<BirthDate>((b) => b.year)]: BirthYear.valueHints
            }
        });
    }

    public static override get renderHints(): RenderHints {
        return super.renderHints.copyWith({
            propertyHints: {
                [nameof<BirthDate>((b) => b.day)]: BirthDay.renderHints,
                [nameof<BirthDate>((b) => b.month)]: BirthMonth.renderHints,
                [nameof<BirthDate>((b) => b.year)]: BirthYear.renderHints
            }
        });
    }

    public static from(value: IBirthDate | Omit<BirthDateJSON, "@type">): BirthDate {
        return this.fromAny(value);
    }

    public override toString(): string {
        return DateTime.fromObject({
            day: this.day.value,
            month: this.month.value,
            year: this.year.value
        }).toFormat("yyyy-MM-dd");
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): BirthDateJSON {
        return super.toJSON(verbose, serializeAsString) as BirthDateJSON;
    }
}
