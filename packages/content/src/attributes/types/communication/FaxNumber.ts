import { type } from "@js-soft/ts-serval";
import { AbstractStringJSON, IAbstractString } from "../AbstractString.js";
import { AbstractPhoneNumber } from "../strings/index.js";

export interface FaxNumberJSON extends AbstractStringJSON {
    "@type": "FaxNumber";
}

export interface IFaxNumber extends IAbstractString {}

@type("FaxNumber")
export class FaxNumber extends AbstractPhoneNumber implements IFaxNumber {
    public static from(value: IFaxNumber | Omit<FaxNumberJSON, "@type"> | string): FaxNumber {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): FaxNumberJSON {
        return super.toJSON(verbose, serializeAsString) as FaxNumberJSON;
    }
}
