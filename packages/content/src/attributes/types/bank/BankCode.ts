import { serialize, type, validate } from "@js-soft/ts-serval";
import { CountryAlpha2 } from "@nmshd/core-types";
import { ValueHints } from "../../hints";
import { AbstractString, AbstractStringJSON, IAbstractString } from "../AbstractString";

const MIN_BANK_CODE_LENGTH = 8;
const MAX_BANK_CODE_LENGTH = 11;
const countryPattern = Object.values(CountryAlpha2).join("|");

export interface BankCodeJSON extends AbstractStringJSON {
    "@type": "BankCode";
}

export interface IBankCode extends IAbstractString {}

@type("BankCode")
export class BankCode extends AbstractString implements IBankCode {
    private static readonly regExp = new RegExp(`^[A-Z]{4}(${countryPattern})[[A-Z0-9]{2}([A-Z0-9]{3})?$`);

    @serialize()
    @validate({
        min: MIN_BANK_CODE_LENGTH,
        max: MAX_BANK_CODE_LENGTH,
        regExp: BankCode.regExp
    })
    public override value: string;

    public static override get valueHints(): ValueHints {
        return super.valueHints.copyWith({
            min: MIN_BANK_CODE_LENGTH,
            max: MAX_BANK_CODE_LENGTH
        });
    }

    public static from(value: IBankCode | Omit<BankCodeJSON, "@type"> | string): BankCode {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): BankCodeJSON {
        return super.toJSON(verbose, serializeAsString) as BankCodeJSON;
    }
}
