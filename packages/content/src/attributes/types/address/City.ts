import { type } from "@js-soft/ts-serval";
import { AbstractStringJSON, IAbstractString } from "../AbstractString";
import { AbstractName } from "../strings/AbstractName";

export interface CityJSON extends AbstractStringJSON {
    "@type": "City";
}

export interface ICity extends IAbstractString {}

@type("City")
export class City extends AbstractName implements ICity {
    public static from(value: ICity | Omit<CityJSON, "@type"> | string): City {
        return this.fromAny(value);
    }
}
