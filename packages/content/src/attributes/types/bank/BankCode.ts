import { serialize, type, validate } from "@js-soft/ts-serval";
import { isValidBIC } from "ibantools";
import { ValueHints } from "../../hints";
import { AbstractString, AbstractStringJSON, IAbstractString } from "../AbstractString";

const MIN_BANK_CODE_LENGTH = 8;
const MAX_BANK_CODE_LENGTH = 11;

export interface BankCodeJSON extends AbstractStringJSON {
    "@type": "BankCode";
}

export interface IBankCode extends IAbstractString {}

@type("BankCode")
export class BankCode extends AbstractString implements IBankCode {
    @serialize()
    @validate({
        min: MIN_BANK_CODE_LENGTH,
        max: MAX_BANK_CODE_LENGTH,
        customValidator: (bic) => (!isValidBIC(bic) ? "invalid BIC" : undefined)
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
