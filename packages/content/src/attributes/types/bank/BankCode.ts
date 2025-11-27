import { type } from "@js-soft/ts-serval";
import { AbstractString, AbstractStringJSON, IAbstractString } from "../AbstractString";

export interface BankCodeJSON extends AbstractStringJSON {
    "@type": "BankCode";
}

export interface IBankCode extends IAbstractString {}

@type("BankCode")
export class BankCode extends AbstractString implements IBankCode {
    public static from(value: IBankCode | Omit<BankCodeJSON, "@type"> | string): BankCode {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): BankCodeJSON {
        return super.toJSON(verbose, serializeAsString) as BankCodeJSON;
    }
}
