import { type } from "@js-soft/ts-serval";
import { AbstractString, AbstractStringJSON, IAbstractString } from "../AbstractString.js";

export interface CityJSON extends AbstractStringJSON {
    "@type": "City";
}

export interface ICity extends IAbstractString {}

@type("City")
export class City extends AbstractString implements ICity {
    public static from(value: ICity | Omit<CityJSON, "@type"> | string): City {
        return this.fromAny(value);
    }
}
