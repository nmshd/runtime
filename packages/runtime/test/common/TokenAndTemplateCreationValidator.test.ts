import { PasswordLocationIndicatorOptions } from "@nmshd/core-types";
import { SodiumWrapper } from "@nmshd/crypto";
import { TokenAndTemplateCreationValidator } from "../../src/useCases/common";

describe("TokenAndTemplateCreationValidator", () => {
    let isValidPasswordLocationIndicator: (value: unknown) => boolean;

    beforeAll(async function () {
        await SodiumWrapper.ready();

        isValidPasswordLocationIndicator = TokenAndTemplateCreationValidator["isValidPasswordLocationIndicator"];
    });

    describe("isValidPasswordLocationIndicator", () => {
        test("should allow to set valid string as PasswordLocationIndicator", function () {
            const result = isValidPasswordLocationIndicator("SMS");
            expect(result).toBe(true);
        });

        test("should allow to set valid number as PasswordLocationIndicator", function () {
            const result = isValidPasswordLocationIndicator(50);
            expect(result).toBe(true);
        });

        test("should not allow to set invalid string as PasswordLocationIndicator", function () {
            const result = isValidPasswordLocationIndicator("Invalid-PasswordLocationIndicatorOption");
            expect(result).toBe(false);
        });

        test("should not allow to set RecoveryKit as PasswordLocationIndicator", function () {
            const result = isValidPasswordLocationIndicator("RecoveryKit");
            expect(result).toBe(false);
        });

        test("should not allow to set valid string with different casing as PasswordLocationIndicator", function () {
            const result = isValidPasswordLocationIndicator("sms");
            expect(result).toBe(false);
        });

        test("should not allow to set number mapping to a PasswordLocationIndicatorOptions as PasswordLocationIndicator", function () {
            const result = isValidPasswordLocationIndicator(PasswordLocationIndicatorOptions.Letter);
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
