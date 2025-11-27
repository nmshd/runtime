import { BankAccount } from "../../src";

describe("creation of IdentityAttributes with value type BankAccount", () => {
    test("can create an IdentityAttribute with value type BankAccount", function () {
        const validBankAccount = BankAccount.from({ accountHolder: "Max Mustermann", accountNumber: "DE89370400440532013000", bankCode: "PDHADEKS" });
        expect(validBankAccount.constructor.name).toBe("BankAccount");
        expect(validBankAccount.accountHolder.value).toBe("Max Mustermann");
        expect(validBankAccount.accountNumber.value).toBe("DE89370400440532013000");
        expect(validBankAccount.bankCode!.value).toBe("PDHADEKS");
    });

    test("returns an error when trying to create an invalid BankAccount with violated validation criteria of a single property", function () {
        const invalidBankAccountCall = () => {
            BankAccount.from({ accountHolder: "Max Mustermann", accountNumber: "anInvalidIBAN", bankCode: "PDHADEKS" });
        };
        expect(invalidBankAccountCall).toThrow("AccountNumber.value :: Value is shorter than 14 characters");
    });
});
