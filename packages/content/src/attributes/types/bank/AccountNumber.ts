import { serialize, type, validate } from "@js-soft/ts-serval";
import { isValidIBAN } from "ibantools";
import { ValueHints } from "../../hints";
import { AbstractString, AbstractStringJSON, IAbstractString } from "../AbstractString";

const MIN_ACCOUNT_NUMBER_LENGTH = 14;
const MAX_ACCOUNT_NUMBER_LENGTH = 34;
export interface AccountNumberJSON extends AbstractStringJSON {
    "@type": "AccountNumber";
}

export interface IAccountNumber extends IAbstractString {}

@type("AccountNumber")
export class AccountNumber extends AbstractString implements IAccountNumber {
    @serialize()
    @validate({
        min: MIN_ACCOUNT_NUMBER_LENGTH,
        max: MAX_ACCOUNT_NUMBER_LENGTH,
        customValidator: (iban) => (!isValidIBAN(iban) ? "invalid IBAN" : undefined)
    })
    public override value: string;

    public static override get valueHints(): ValueHints {
        return super.valueHints.copyWith({
            min: MIN_ACCOUNT_NUMBER_LENGTH,
            max: MAX_ACCOUNT_NUMBER_LENGTH
        });
    }

    public static from(value: IAccountNumber | Omit<AccountNumberJSON, "@type"> | string): AccountNumber {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): AccountNumberJSON {
        return super.toJSON(verbose, serializeAsString) as AccountNumberJSON;
    }
}
