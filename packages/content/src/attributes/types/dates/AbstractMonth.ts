import { serialize, validate } from "@js-soft/ts-serval";
import { RenderHints, RenderHintsDataType, RenderHintsEditType } from "../../../attributes/hints/index.js";
import { ValueHints } from "../../hints/ValueHints.js";
import { AbstractInteger, AbstractIntegerJSON, IAbstractInteger } from "../AbstractInteger.js";

export interface AbstractMonthJSON extends AbstractIntegerJSON {
    value: Month;
}

export interface IAbstractMonth extends IAbstractInteger {
    value: Month;
}

/**
 * Month values: 1 (january) - 12 (december)
 */
enum Month {
    January = 1,
    February = 2,
    March = 3,
    April = 4,
    May = 5,
    June = 6,
    July = 7,
    August = 8,
    September = 9,
    October = 10,
    November = 11,
    December = 12
}

/**
 * Month value are continuously numbered: 1 (january) - 12 (december)
 */
export class AbstractMonth extends AbstractInteger implements IAbstractMonth {
    @serialize()
    @validate({
        customValidator: (v) => (!Month[v] || !Number.isInteger(v) ? `must be an integer value between ${Month.January} and ${Month.December}` : undefined)
    })
    public override value: Month;

    public static override get valueHints(): ValueHints {
        return super.valueHints.copyWith({
            min: 1,
            max: 12
        });
    }

    public static override get renderHints(): RenderHints {
        return super.renderHints.copyWith({
            editType: RenderHintsEditType.SelectLike,
            dataType: RenderHintsDataType.Month
        });
    }
}
