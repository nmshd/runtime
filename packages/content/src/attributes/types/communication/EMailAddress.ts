import { type } from "@js-soft/ts-serval";
import { AbstractStringJSON, IAbstractString } from "../AbstractString.js";
import { AbstractEMailAddress } from "../strings/AbstractEMailAddress.js";

export interface EMailAddressJSON extends AbstractStringJSON {
    "@type": "EMailAddress";
}

export interface IEMailAddress extends IAbstractString {}

@type("EMailAddress")
export class EMailAddress extends AbstractEMailAddress implements IEMailAddress {
    public static from(value: IEMailAddress | Omit<EMailAddressJSON, "@type"> | string): EMailAddress {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): EMailAddressJSON {
        return super.toJSON(verbose, serializeAsString) as EMailAddressJSON;
    }
}
