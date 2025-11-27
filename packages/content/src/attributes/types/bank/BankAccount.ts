import { serialize, type, validate } from "@js-soft/ts-serval";
import { nameof } from "ts-simple-nameof";
import { AbstractAttributeValue } from "../../AbstractAttributeValue";
import { AbstractComplexValue, AbstractComplexValueJSON, IAbstractComplexValue } from "../../AbstractComplexValue";
import { RenderHints, ValueHints } from "../../hints";
import { AccountHolder, IAccountHolder } from "./AccountHolder";
import { AccountNumber, IAccountNumber } from "./AccountNumber";
import { BankCode, IBankCode } from "./BankCode";

export interface BankAccountJSON extends AbstractComplexValueJSON {
    "@type": "BankAccount";
    accountHolder: string;
    accountNumber: string;
    bankCode?: string;
}

export interface IBankAccount extends IAbstractComplexValue {
    accountHolder: IAccountHolder | string;
    accountNumber: IAccountNumber | string;
    bankCode?: IBankCode | string;
}

@type("BankAccount")
export class BankAccount extends AbstractComplexValue implements IBankAccount {
    @serialize({ customGenerator: AbstractAttributeValue.valueGenerator })
    @validate({ max: 100 })
    public accountHolder: AccountHolder;

    @serialize({ customGenerator: AbstractAttributeValue.valueGenerator })
    @validate()
    public accountNumber: AccountNumber;

    @serialize({ customGenerator: AbstractAttributeValue.valueGenerator })
    @validate({ nullable: true })
    public bankCode?: BankCode;

    public static from(value: IBankAccount | Omit<BankAccountJSON, "@type">): BankAccount {
        return this.fromAny(value);
    }

    public static get valueHints(): ValueHints {
        return ValueHints.from({
            propertyHints: {
                [nameof<BankAccount>((s) => s.accountHolder)]: AccountHolder.valueHints,
                [nameof<BankAccount>((s) => s.accountNumber)]: AccountNumber.valueHints,
                [nameof<BankAccount>((s) => s.bankCode)]: BankCode.valueHints
            }
        });
    }

    public static override get renderHints(): RenderHints {
        return super.renderHints.copyWith({
            propertyHints: {
                [nameof<BankAccount>((s) => s.accountHolder)]: AccountHolder.renderHints,
                [nameof<BankAccount>((s) => s.accountNumber)]: AccountNumber.renderHints,
                [nameof<BankAccount>((s) => s.bankCode)]: BankCode.renderHints
            }
        });
    }

    public override toString(): string {
        const value: string[] = [];
        value.push(`${this.accountHolder}`);
        value.push(`${this.accountNumber}`);
        if (this.bankCode) {
            value.push(this.bankCode.toString());
        }

        return value.join("\n");
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): BankAccountJSON {
        return super.toJSON(verbose, serializeAsString) as BankAccountJSON;
    }
}
