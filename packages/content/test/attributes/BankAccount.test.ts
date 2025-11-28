import { BankAccount } from "../../src";

describe("creation of IdentityAttributes with value type BankAccount", () => {
    const aValidAccountHolder = "Max Mustermann";
    const aValidAccountNumber = "DE02500105170137075030";
    const aValidBankCode = "INGDDEFF";

    test("can create a BankAccount", function () {
        const validBankAccount = BankAccount.from({ accountHolder: aValidAccountHolder, accountNumber: aValidAccountNumber, bankCode: aValidBankCode });

        expect(validBankAccount.constructor.name).toBe("BankAccount");
        expect(validBankAccount.accountHolder.value).toBe(aValidAccountHolder);
        expect(validBankAccount.accountNumber.value).toBe(aValidAccountNumber);
        expect(validBankAccount.bankCode!.value).toBe(aValidBankCode);
    });

    test("can create a BankAccount without optional bankCode property", function () {
        const validBankAccount = BankAccount.from({ accountHolder: aValidAccountHolder, accountNumber: aValidAccountNumber });

        expect(validBankAccount.constructor.name).toBe("BankAccount");
        expect(validBankAccount.accountHolder.value).toBe(aValidAccountHolder);
        expect(validBankAccount.accountNumber.value).toBe(aValidAccountNumber);
        expect(validBankAccount.bankCode).toBeUndefined();
    });

    test("returns an error when trying to create a BankAccount with an invalid accountNumber", function () {
        const anInvalidAccountNumber = "X".repeat(22);
        const invalidBankAccountCall = () => {
            BankAccount.from({ accountHolder: aValidAccountHolder, accountNumber: anInvalidAccountNumber, bankCode: aValidBankCode });
        };

        expect(invalidBankAccountCall).toThrow("AccountNumber.value:String :: invalid IBAN");
    });

    test("returns an error when trying to create a BankAccount with an invalid bankCode", function () {
        const anInvalidBankCode = "X".repeat(8);
        const invalidBankAccountCall = () => {
            BankAccount.from({ accountHolder: aValidAccountHolder, accountNumber: aValidAccountNumber, bankCode: anInvalidBankCode });
        };

        expect(invalidBankAccountCall).toThrow("BankCode.value:String :: invalid BIC");
    });
});
