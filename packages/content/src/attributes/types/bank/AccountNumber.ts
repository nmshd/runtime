import { serialize, type, validate } from "@js-soft/ts-serval";
import { isValid } from "iban-ts";
import { AbstractString, AbstractStringJSON, IAbstractString } from "../AbstractString";

export interface AccountNumberJSON extends AbstractStringJSON {
    "@type": "AccountNumber";
}

export interface IAccountNumber extends IAbstractString {}

@type("AccountNumber")
export class AccountNumber extends AbstractString implements IAccountNumber {
    @serialize()
    @validate({customValidator: (iban) => (!isValid(iban) ? "invalid IBAN" : undefined)})
    public override value: string;

    public static from(value: IAccountNumber | Omit<AccountNumberJSON, "@type"> | string): AccountNumber {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): AccountNumberJSON {
        return super.toJSON(verbose, serializeAsString) as AccountNumberJSON;
    }
}
