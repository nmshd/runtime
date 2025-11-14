import { type } from "@js-soft/ts-serval";
import { AbstractStringJSON, IAbstractString } from "../AbstractString.js";
import { AbstractPhoneNumber } from "../strings/index.js";

export interface PhoneNumberJSON extends AbstractStringJSON {
    "@type": "PhoneNumber";
}

export interface IPhoneNumber extends IAbstractString {}

@type("PhoneNumber")
export class PhoneNumber extends AbstractPhoneNumber implements IPhoneNumber {
    public static from(value: IPhoneNumber | Omit<PhoneNumberJSON, "@type"> | string): PhoneNumber {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): PhoneNumberJSON {
        return super.toJSON(verbose, serializeAsString) as PhoneNumberJSON;
    }
}
