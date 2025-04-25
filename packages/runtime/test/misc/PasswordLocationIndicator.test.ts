import { CoreBuffer, SodiumWrapper } from "@nmshd/crypto";
import { isValidPasswordLocationIndicator, PasswordLocationIndicatorStrings } from "src/useCases/common";

describe("PasswordLocationIndicatorMedium", () => {
    beforeAll(async () => await SodiumWrapper.ready());

    describe("isValidPasswordLocationIndicator", () => {
        test("should allow to set valid enum entry as PasswordLocationIndicator", function () {
            const result = isValidPasswordLocationIndicator(PasswordLocationIndicatorStrings.Letter);
            expect(result).toBeUndefined();
        });

        test("should allow to set valid string as PasswordLocationIndicator", function () {
            const result = isValidPasswordLocationIndicator("Letter" as PasswordLocationIndicatorStrings);
            expect(result).toBeUndefined();
        });

        test("should allow to set valid number as PasswordLocationIndicator", function () {
            const result = isValidPasswordLocationIndicator(50);
            expect(result).toBeUndefined();
        });

        test("should allow to set valid number mapping to a PasswordLocationIndicatorStrings as PasswordLocationIndicator", function () {
            const result = isValidPasswordLocationIndicator(0);
            expect(result).toBeUndefined();
        });

        test("should not allow to set invalid string as PasswordLocationIndicator", function () {
            const result = isValidPasswordLocationIndicator("Invalid-PasswordLocationIndicatorStrings" as any);
            expect(result).toBe("must be a number from 0 to 99 or one of the following strings: RecoveryKit, Self, Letter, RegistrationLetter, Mail, Sms, App, Website");
        });

        // TODO: also lower number
        test("should not allow to set invalid number as PasswordLocationIndicator", function () {
            const result = isValidPasswordLocationIndicator(100);
            expect(result).toBe("must be a number from 0 to 99 or one of the following strings: RecoveryKit, Self, Letter, RegistrationLetter, Mail, Sms, App, Website");
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

        test("should convert PasswordLocationIndicatorStrings to number", function () {
            const sharedPasswordProtection = SharedPasswordProtection.from({
                passwordType: "pw",
                salt: CoreBuffer.random(16),
                passwordLocationIndicator: PasswordLocationIndicatorStrings.RecoveryKit
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

        test("should convert to PasswordLocationIndicatorStrings", function () {
            const sharedPasswordProtection = SharedPasswordProtection.from({
                passwordType: "pw",
                salt: CoreBuffer.random(16),
                passwordLocationIndicator: PasswordLocationIndicatorStrings.RecoveryKit
            });
            const truncatedSharedPasswordProtection = sharedPasswordProtection.truncate();

            const deserializedSharedPasswordProtection = SharedPasswordProtection.fromTruncated(truncatedSharedPasswordProtection);
            expect(deserializedSharedPasswordProtection!.passwordLocationIndicator).toBe(PasswordLocationIndicatorStrings.RecoveryKit);
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
