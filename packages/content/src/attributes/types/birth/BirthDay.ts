import { type } from "@js-soft/ts-serval";
import { AbstractDay, AbstractDayJSON, IAbstractDay } from "../dates/index.js";

export interface BirthDayJSON extends AbstractDayJSON {
    "@type": "BirthDay";
}

export interface IBirthDay extends IAbstractDay {}

@type("BirthDay")
export class BirthDay extends AbstractDay implements IBirthDay {
    public static from(value: IBirthDay | Omit<BirthDayJSON, "@type"> | number): BirthDay {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): BirthDayJSON {
        return super.toJSON(verbose, serializeAsString) as BirthDayJSON;
    }
}
