import { type } from "@js-soft/ts-serval";
import { AbstractString, AbstractStringJSON, IAbstractString } from "../AbstractString.js";

export interface HouseNumberJSON extends AbstractStringJSON {
    "@type": "HouseNumber";
}

export interface IHouseNumber extends IAbstractString {}

@type("HouseNumber")
export class HouseNumber extends AbstractString implements IHouseNumber {
    public static from(value: IHouseNumber | Omit<HouseNumberJSON, "@type"> | string): HouseNumber {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): HouseNumberJSON {
        return super.toJSON(verbose, serializeAsString) as HouseNumberJSON;
    }
}
