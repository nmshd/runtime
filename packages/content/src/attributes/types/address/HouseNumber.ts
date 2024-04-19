import { type } from "@js-soft/ts-serval";
import { AbstractStringJSON, IAbstractString } from "../AbstractString";
import { AbstractHouseNumber } from "../strings";

export interface HouseNumberJSON extends AbstractStringJSON {
    "@type": "HouseNumber";
}

export interface IHouseNumber extends IAbstractString {}

@type("HouseNumber")
export class HouseNumber extends AbstractHouseNumber implements IHouseNumber {
    public static from(value: IHouseNumber | Omit<HouseNumberJSON, "@type"> | string): HouseNumber {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): HouseNumberJSON {
        return super.toJSON(verbose, serializeAsString) as HouseNumberJSON;
    }
}
