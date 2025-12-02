import { BankAccount } from "../../src";

describe("creation of IdentityAttributes with value type BankAccount", () => {
    const aValidAccountHolder = "Max Mustermann";
    const aValidIban = "DE02500105170137075030";
    const aValidBic = "INGDDEFF";

    test("can create a BankAccount", function () {
        const validBankAccount = BankAccount.from({ accountHolder: aValidAccountHolder, iban: aValidIban, bic: aValidBic });

        expect(validBankAccount.constructor.name).toBe("BankAccount");
        expect(validBankAccount.accountHolder).toBe(aValidAccountHolder);
        expect(validBankAccount.iban).toBe(aValidIban);
        expect(validBankAccount.bic!).toBe(aValidBic);
    });

    test("can create a BankAccount without optional bic property", function () {
        const validBankAccount = BankAccount.from({ accountHolder: aValidAccountHolder, iban: aValidIban });

        expect(validBankAccount.constructor.name).toBe("BankAccount");
        expect(validBankAccount.accountHolder).toBe(aValidAccountHolder);
        expect(validBankAccount.iban).toBe(aValidIban);
        expect(validBankAccount.bic).toBeUndefined();
    });

    test("returns an error when trying to create a BankAccount with an invalid IBAN", function () {
        const anInvalidIban = "X".repeat(22);
        const invalidBankAccountCall = () => {
            BankAccount.from({ accountHolder: aValidAccountHolder, iban: anInvalidIban, bic: aValidBic });
        };

        expect(invalidBankAccountCall).toThrow("BankAccount.iban:String :: invalid IBAN");
    });

    test("returns an error when trying to create a BankAccount with an invalid BIC", function () {
        const anInvalidBic = "X".repeat(8);
        const invalidBankAccountCall = () => {
            BankAccount.from({ accountHolder: aValidAccountHolder, iban: aValidIban, bic: anInvalidBic });
        };

        expect(invalidBankAccountCall).toThrow("BankAccount.bic:String :: invalid BIC");
    });
});
