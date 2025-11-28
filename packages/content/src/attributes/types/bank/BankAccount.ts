import { serialize, type, validate } from "@js-soft/ts-serval";
import { isValidBIC, isValidIBAN } from "ibantools";
import { nameof } from "ts-simple-nameof";
import { AbstractAttributeValue } from "../../AbstractAttributeValue";
import { AbstractComplexValue, AbstractComplexValueJSON, IAbstractComplexValue } from "../../AbstractComplexValue";
import { RenderHints, ValueHints } from "../../hints";
import { AbstractString } from "../AbstractString";

const MAX_ACCOUNT_HOLDER_LENGTH = 100;
const MIN_ACCOUNT_NUMBER_LENGTH = 14;
const MAX_ACCOUNT_NUMBER_LENGTH = 34;
const MIN_BANK_CODE_LENGTH = 8;
const MAX_BANK_CODE_LENGTH = 11;

export interface BankAccountJSON extends AbstractComplexValueJSON {
    "@type": "BankAccount";
    accountHolder: string;
    iban: string;
    bic?: string;
}

export interface IBankAccount extends IAbstractComplexValue {
    accountHolder: string;
    iban: string;
    bic?: string;
}

@type("BankAccount")
export class BankAccount extends AbstractComplexValue implements IBankAccount {
    @serialize({ customGenerator: AbstractAttributeValue.valueGenerator })
    @validate({ max: MAX_ACCOUNT_HOLDER_LENGTH })
    public accountHolder: string;

    @serialize({ customGenerator: AbstractAttributeValue.valueGenerator })
    @validate({
        min: MIN_ACCOUNT_NUMBER_LENGTH,
        max: MAX_ACCOUNT_NUMBER_LENGTH,
        customValidator: (iban) => (!isValidIBAN(iban) ? "invalid IBAN" : undefined)
    })
    public iban: string;

    @serialize({ customGenerator: AbstractAttributeValue.valueGenerator })
    @validate({
        nullable: true,
        min: MIN_BANK_CODE_LENGTH,
        max: MAX_BANK_CODE_LENGTH,
        customValidator: (bic) => (!isValidBIC(bic) ? "invalid BIC" : undefined)
    })
    public bic?: string;

    public static from(value: IBankAccount | Omit<BankAccountJSON, "@type">): BankAccount {
        return this.fromAny(value);
    }

    public static get valueHints(): ValueHints {
        return ValueHints.from({
            propertyHints: {
                [nameof<BankAccount>((s) => s.accountHolder)]: ValueHints.from({
                    max: MAX_ACCOUNT_HOLDER_LENGTH
                }),
                [nameof<BankAccount>((s) => s.iban)]: ValueHints.from({
                    min: MIN_ACCOUNT_NUMBER_LENGTH,
                    max: MAX_ACCOUNT_NUMBER_LENGTH
                }),
                [nameof<BankAccount>((s) => s.bic)]: ValueHints.from({
                    min: MIN_BANK_CODE_LENGTH,
                    max: MAX_BANK_CODE_LENGTH
                })
            }
        });
    }

    public static override get renderHints(): RenderHints {
        return super.renderHints.copyWith({
            propertyHints: {
                [nameof<BankAccount>((s) => s.accountHolder)]: AbstractString.renderHints,
                [nameof<BankAccount>((s) => s.iban)]: AbstractString.renderHints,
                [nameof<BankAccount>((s) => s.bic)]: AbstractString.renderHints
            }
        });
    }

    public override toString(): string {
        const value: string[] = [];
        value.push(`${this.accountHolder}`);
        value.push(`${this.iban}`);
        if (this.bic) {
            value.push(this.bic.toString());
        }

        return value.join("\n");
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): BankAccountJSON {
        return super.toJSON(verbose, serializeAsString) as BankAccountJSON;
    }
}
