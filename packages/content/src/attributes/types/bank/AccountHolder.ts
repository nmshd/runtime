import { type } from "@js-soft/ts-serval";
import { AbstractString, AbstractStringJSON, IAbstractString } from "../AbstractString";

export interface AccountHolderJSON extends AbstractStringJSON {
    "@type": "AccountHolder";
}

export interface IAccountHolder extends IAbstractString {}

@type("AccountHolder")
export class AccountHolder extends AbstractString implements IAccountHolder {
    public static from(value: IAccountHolder | Omit<AccountHolderJSON, "@type"> | string): AccountHolder {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): AccountHolderJSON {
        return super.toJSON(verbose, serializeAsString) as AccountHolderJSON;
    }
}
