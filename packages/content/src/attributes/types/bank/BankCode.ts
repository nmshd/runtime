import { serialize, type, validate } from "@js-soft/ts-serval";
import { AbstractString, AbstractStringJSON, IAbstractString } from "../AbstractString";

export interface BankCodeJSON extends AbstractStringJSON {
    "@type": "BankCode";
}

export interface IBankCode extends IAbstractString {}

@type("BankCode")
export class BankCode extends AbstractString implements IBankCode {
    private static readonly regExp = new RegExp( /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/ );

    @serialize()
    @validate({
        min: 8,
        max: 11,
        regExp: BankCode.regExp
    })
    public override value: string;

    public static from(value: IBankCode | Omit<BankCodeJSON, "@type"> | string): BankCode {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): BankCodeJSON {
        return super.toJSON(verbose, serializeAsString) as BankCodeJSON;
    }
}
