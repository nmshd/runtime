import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreErrors } from "@nmshd/consumption/src/consumption/CoreErrors";
import { ValidationResult } from "@nmshd/consumption/src/modules/common/ValidationResult";
import nameOf from "easy-tsnameof";
import { DateTime } from "luxon";
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

    public constructor(day: BirthDay, month: BirthMonth, year: BirthYear) {
        super();
        this.day = day;
        this.month = month;
        this.year = year;
        this.validateDate();
    }

    private validateDate(): ValidationResult {
        if (this.month.value === 2 && (this.day.value === 31 || this.day.value === 30 || (!this.withinLeapYear() && this.day.value === 29))) {
            return ValidationResult.error(CoreErrors.attributes.invalidPropertyValue("The BirthDate is not a valid date."));
        }

        if ((this.month.value === 4 || this.month.value === 6 || this.month.value === 9 || this.month.value === 11) && this.day.value === 31) {
            return ValidationResult.error(CoreErrors.attributes.invalidPropertyValue("The BirthDate is not a valid date."));
        }

        return ValidationResult.success();
    }

    private withinLeapYear(): boolean {
        return (this.year.value % 4 === 0 && this.year.value % 100 !== 0) || this.year.value % 400 === 0;
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
