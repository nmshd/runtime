import { Serializable, serialize, type, validate, ValidationError } from "@js-soft/ts-serval";
import nameOf from "easy-tsnameof";
import { DateTime } from "luxon";
import { nameof } from "ts-simple-nameof";
import { AbstractAttributeValue } from "../../AbstractAttributeValue";
import { AbstractComplexValue, AbstractComplexValueJSON, IAbstractComplexValue } from "../../AbstractComplexValue";
import { RenderHints, ValueHints } from "../../hints";
import { BirthDay, IBirthDay } from "./BirthDay";
import { BirthMonth, IBirthMonth } from "./BirthMonth";
import { BirthYear, IBirthYear } from "./BirthYear";

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
    public static readonly propertyNames = nameOf<BirthDate, never>();

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
            throw new ValidationError(
                BirthDate.name,
                `${nameof<BirthDate>((x) => x.day)}, ${BirthDate.name}.${nameof<BirthDate>((x) => x.month)} or ${BirthDate.name}.${nameof<BirthDate>((x) => x.year)}`,
                "The BirthDate is not a valid date."
            );
        }

        return value;
    }

    public static get valueHints(): ValueHints {
        return ValueHints.from({
            propertyHints: {
                [this.propertyNames.day.$path]: BirthDay.valueHints,
                [this.propertyNames.month.$path]: BirthMonth.valueHints,
                [this.propertyNames.year.$path]: BirthYear.valueHints
            }
        });
    }

    public static override get renderHints(): RenderHints {
        return super.renderHints.copyWith({
            propertyHints: {
                [this.propertyNames.day.$path]: BirthDay.renderHints,
                [this.propertyNames.month.$path]: BirthMonth.renderHints,
                [this.propertyNames.year.$path]: BirthYear.renderHints
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
