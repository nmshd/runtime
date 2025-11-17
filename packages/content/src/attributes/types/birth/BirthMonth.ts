import { type } from "@js-soft/ts-serval";
import { ValueHints } from "../../hints/ValueHints.js";
import { AbstractMonth, AbstractMonthJSON, IAbstractMonth } from "../dates/AbstractMonth.js";

export interface BirthMonthJSON extends AbstractMonthJSON {
    "@type": "BirthMonth";
}

export interface IBirthMonth extends IAbstractMonth {}

@type("BirthMonth")
export class BirthMonth extends AbstractMonth implements IAbstractMonth {
    public static override get valueHints(): ValueHints {
        return super.valueHints.copyWith({
            editHelp: "i18n://yourBirthMonth"
        });
    }

    public static from(value: IBirthMonth | Omit<BirthMonthJSON, "@type"> | number): BirthMonth {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): BirthMonthJSON {
        return super.toJSON(verbose, serializeAsString) as BirthMonthJSON;
    }
}
