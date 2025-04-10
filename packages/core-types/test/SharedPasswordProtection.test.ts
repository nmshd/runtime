import { CoreBuffer, SodiumWrapper } from "@nmshd/crypto";
import { PasswordLocationIndicatorMedium, SharedPasswordProtection } from "../src";

describe("SharedPasswordProtection", () => {
    beforeAll(async () => await SodiumWrapper.ready());

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
