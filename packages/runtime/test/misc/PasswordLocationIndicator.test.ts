import { SodiumWrapper } from "@nmshd/crypto";
import { isValidPasswordLocationIndicator, PasswordLocationIndicatorStrings } from "../../src";

describe("PasswordLocationIndicator", () => {
    beforeAll(async () => await SodiumWrapper.ready());

    describe("isValidPasswordLocationIndicator", () => {
        test("should allow to set valid string as PasswordLocationIndicator", function () {
            const result = isValidPasswordLocationIndicator("SMS");
            expect(result).toBe(true);
        });

        test("should allow to set valid string with different casing as PasswordLocationIndicator", function () {
            const result = isValidPasswordLocationIndicator("sms");
            expect(result).toBe(true);
        });

        test("should allow to set valid number as PasswordLocationIndicator", function () {
            const result = isValidPasswordLocationIndicator(50);
            expect(result).toBe(true);
        });

        test("should not allow to set invalid string as PasswordLocationIndicator", function () {
            const result = isValidPasswordLocationIndicator("Invalid-PasswordLocationIndicatorString");
            expect(result).toBe(false);
        });

        test("should not allow to set RecoveryKit as PasswordLocationIndicator", function () {
            const result = isValidPasswordLocationIndicator("RecoveryKit");
            expect(result).toBe(false);
        });

        test("should not allow to set number mapping to a PasswordLocationIndicatorStrings as PasswordLocationIndicator", function () {
            const result = isValidPasswordLocationIndicator(PasswordLocationIndicatorStrings.Letter);
            expect(result).toBe(false);
        });

        test("should not allow to set number higher than maximum as PasswordLocationIndicator", function () {
            const result = isValidPasswordLocationIndicator(100);
            expect(result).toBe(false);
        });

        test("should not allow to set number lower than minimum as PasswordLocationIndicator", function () {
            const result = isValidPasswordLocationIndicator(49);
            expect(result).toBe(false);
        });
    });
});
