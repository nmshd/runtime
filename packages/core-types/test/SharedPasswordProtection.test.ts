import { CoreBuffer, SodiumWrapper } from "@nmshd/crypto";
import { PasswordLocationIndicator, PasswordLocationIndicatorMedium, SharedPasswordProtection, validatePasswordLocationIndicator } from "../src";

describe("SharedPasswordProtection", () => {
    beforeAll(async () => await SodiumWrapper.ready());

    describe("validatePasswordLocationIndicator", () => {
        test("should allow to set valid enum entry as PasswordLocationIndicator", function () {
            const result = validatePasswordLocationIndicator(PasswordLocationIndicatorMedium.Letter);
            expect(result).toBeUndefined();
        });

        test("should allow to set valid string as PasswordLocationIndicator", function () {
            const result = validatePasswordLocationIndicator("Letter" as PasswordLocationIndicatorMedium);
            expect(result).toBeUndefined();
        });

        test("should allow to set valid number as PasswordLocationIndicator", function () {
            const result = validatePasswordLocationIndicator(50);
            expect(result).toBeUndefined();
        });

        test("should allow to set valid number mapping to a PasswordLocationIndicatorMedium as PasswordLocationIndicator", function () {
            const result = validatePasswordLocationIndicator(0 as PasswordLocationIndicator);
            expect(result).toBeUndefined();
        });

        test("should not allow to set invalid string as PasswordLocationIndicator", function () {
            const result = validatePasswordLocationIndicator("Invalid-PasswordLocationIndicatorMedium" as any);
            expect(result).toBe("must be a number between 0 and 99 or one of the following strings: RecoveryKit, Self, Letter, RegistrationLetter, Mail, Sms, App, Website");
        });

        test("should not allow to set invalid number as PasswordLocationIndicator", function () {
            const result = validatePasswordLocationIndicator(100 as any);
            expect(result).toBe("must be a number between 0 and 99 or one of the following strings: RecoveryKit, Self, Letter, RegistrationLetter, Mail, Sms, App, Website");
        });
    });

    describe("serialization", () => {
        test("should add passwordLocationIndicator", function () {
            const sharedPasswordProtection = SharedPasswordProtection.from({
                passwordType: "pw",
                salt: CoreBuffer.random(16),
                passwordLocationIndicator: 50
            });

            const truncatedSharedPasswordProtection = sharedPasswordProtection.truncate();
            const splittedPasswordParts = truncatedSharedPasswordProtection.split("&");
            expect(splittedPasswordParts).toHaveLength(3);
            expect(splittedPasswordParts[2]).toBe("50");
        });

        test("should convert passwordLocationIndicatorMedium to number", function () {
            const sharedPasswordProtection = SharedPasswordProtection.from({
                passwordType: "pw",
                salt: CoreBuffer.random(16),
                passwordLocationIndicator: PasswordLocationIndicatorMedium.RecoveryKit
            });

            const truncatedSharedPasswordProtection = sharedPasswordProtection.truncate();
            const splittedPasswordParts = truncatedSharedPasswordProtection.split("&");
            expect(splittedPasswordParts).toHaveLength(3);
            expect(splittedPasswordParts[2]).toBe("0");
        });

        test("should not add passwordLocationIndicator if none is set", function () {
            const sharedPasswordProtection = SharedPasswordProtection.from({
                passwordType: "pw",
                salt: CoreBuffer.random(16)
            });

            const truncatedSharedPasswordProtection = sharedPasswordProtection.truncate();
            const splittedPasswordParts = truncatedSharedPasswordProtection.split("&");
            expect(splittedPasswordParts).toHaveLength(2);
        });
    });

    describe("deserialization", () => {
        test("should add passwordLocationIndicator", function () {
            const sharedPasswordProtection = SharedPasswordProtection.from({
                passwordType: "pw",
                salt: CoreBuffer.random(16),
                passwordLocationIndicator: 50
            });
            const truncatedSharedPasswordProtection = sharedPasswordProtection.truncate();

            const deserializedSharedPasswordProtection = SharedPasswordProtection.fromTruncated(truncatedSharedPasswordProtection);
            expect(deserializedSharedPasswordProtection!.passwordLocationIndicator).toBe(50);
        });

        test("should convert to passwordLocationIndicatorMedium", function () {
            const sharedPasswordProtection = SharedPasswordProtection.from({
                passwordType: "pw",
                salt: CoreBuffer.random(16),
                passwordLocationIndicator: PasswordLocationIndicatorMedium.RecoveryKit
            });
            const truncatedSharedPasswordProtection = sharedPasswordProtection.truncate();

            const deserializedSharedPasswordProtection = SharedPasswordProtection.fromTruncated(truncatedSharedPasswordProtection);
            expect(deserializedSharedPasswordProtection!.passwordLocationIndicator).toBe(PasswordLocationIndicatorMedium.RecoveryKit);
            expect(deserializedSharedPasswordProtection!.passwordLocationIndicator).toBe(0);
        });

        test("should not add passwordLocationIndicator if none is set", function () {
            const sharedPasswordProtection = SharedPasswordProtection.from({
                passwordType: "pw",
                salt: CoreBuffer.random(16)
            });
            const truncatedSharedPasswordProtection = sharedPasswordProtection.truncate();

            const deserializedSharedPasswordProtection = SharedPasswordProtection.fromTruncated(truncatedSharedPasswordProtection);
            expect(deserializedSharedPasswordProtection!.passwordLocationIndicator).toBeUndefined();
        });
    });
});
