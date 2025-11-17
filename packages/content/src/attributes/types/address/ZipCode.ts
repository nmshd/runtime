import { type } from "@js-soft/ts-serval";
import { AbstractString, AbstractStringJSON, IAbstractString } from "../AbstractString.js";

export interface ZipCodeJSON extends AbstractStringJSON {
    "@type": "ZipCode";
}

export interface IZipCode extends IAbstractString {}

@type("ZipCode")
export class ZipCode extends AbstractString implements IZipCode {
    public static from(value: IZipCode | Omit<ZipCodeJSON, "@type"> | string): ZipCode {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): ZipCodeJSON {
        return super.toJSON(verbose, serializeAsString) as ZipCodeJSON;
    }
}
