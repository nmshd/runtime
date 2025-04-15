import { CoreDate } from "@nmshd/core-types";
import { TokenReference } from "@nmshd/transport";
import { RuntimeServiceProvider, TestRuntimeServices, uploadOwnToken } from "../../lib";

const serviceProvider = new RuntimeServiceProvider();
let runtimeServices1: TestRuntimeServices;
let runtimeServices2: TestRuntimeServices;

beforeAll(async () => {
    const runtimeServices = await serviceProvider.launch(2);
    runtimeServices1 = runtimeServices[0];
    runtimeServices2 = runtimeServices[1];
}, 30000);
afterAll(() => serviceProvider.stop());

describe("Password-protected tokens", () => {
    test("send and receive a password-protected token", async () => {
        const token = await uploadOwnToken(runtimeServices1.transport, undefined, { password: "password" });
        expect(token.passwordProtection?.password).toBe("password");
        expect(token.passwordProtection?.passwordIsPin).toBeUndefined();

        const reference = TokenReference.from(token.truncatedReference);
        expect(reference.passwordProtection!.passwordType).toBe("pw");

        const loadResult = await runtimeServices2.transport.tokens.loadPeerToken({ reference: token.truncatedReference, ephemeral: true, password: "password" });
        expect(loadResult).toBeSuccessful();
        expect(loadResult.value.passwordProtection?.password).toBe("password");
        expect(loadResult.value.passwordProtection?.passwordIsPin).toBeUndefined();
    });

    test("send and receive a PIN-protected token", async () => {
        const token = await uploadOwnToken(runtimeServices1.transport, undefined, { password: "1234", passwordIsPin: true });
        expect(token.passwordProtection?.password).toBe("1234");
        expect(token.passwordProtection?.passwordIsPin).toBe(true);

        const reference = TokenReference.from(token.truncatedReference);
        expect(reference.passwordProtection!.passwordType).toBe("pin4");

        const loadResult = await runtimeServices2.transport.tokens.loadPeerToken({ reference: token.truncatedReference, ephemeral: true, password: "1234" });
        expect(loadResult).toBeSuccessful();
        expect(loadResult.value.passwordProtection?.password).toBe("1234");
        expect(loadResult.value.passwordProtection?.passwordIsPin).toBe(true);
    });

    test("send token with passwordLocationIndicator", async () => {
        const token = await uploadOwnToken(runtimeServices1.transport, undefined, { password: "password", passwordLocationIndicator: 50 });
        expect(token.passwordProtection!.passwordLocationIndicator).toBe(50);

        const reference = TokenReference.from(token.truncatedReference);
        expect(reference.passwordProtection!.passwordLocationIndicator).toBe(50);
    });

    test("error when loading a token with a wrong password", async () => {
        const token = await uploadOwnToken(runtimeServices1.transport, undefined, { password: "password" });

        const loadResult = await runtimeServices2.transport.tokens.loadPeerToken({ reference: token.truncatedReference, ephemeral: true, password: "wrong-password" });
        expect(loadResult).toBeAnError(/.*/, "error.runtime.recordNotFound");
    });

    test("error when loading a token with no password", async () => {
        const token = await uploadOwnToken(runtimeServices1.transport, undefined, { password: "password" });

        const loadResult = await runtimeServices2.transport.tokens.loadPeerToken({
            reference: token.truncatedReference,
            ephemeral: true
        });
        expect(loadResult).toBeAnError(/.*/, "error.transport.noPasswordProvided");
    });

    test("validation error when creating a token with empty string as the password", async () => {
        const createResult = await runtimeServices1.transport.tokens.createOwnToken({
            content: { key: "value" },
            expiresAt: CoreDate.utc().add({ minutes: 10 }).toISOString(),
            ephemeral: true,
            passwordProtection: { password: "" }
        });
        expect(createResult).toBeAnError("password must NOT have fewer than 1 characters", "error.runtime.validation.invalidPropertyValue");
    });

    test("validation error when creating a token with an invalid PIN", async () => {
        const createResult = await runtimeServices1.transport.tokens.createOwnToken({
            content: { key: "value" },
            expiresAt: CoreDate.utc().add({ minutes: 10 }).toISOString(),
            ephemeral: true,
            passwordProtection: { password: "invalid-pin", passwordIsPin: true }
        });
        expect(createResult).toBeAnError(
            "'passwordProtection.passwordIsPin' is true, hence 'passwordProtection.password' must consist of 4 to 16 digits from 0 to 9.",
            "error.runtime.validation.invalidPropertyValue"
        );
    });

    test("validation error when creating a token with an invalid PasswordLocationIndicator", async () => {
        const createResult = await runtimeServices1.transport.tokens.createOwnToken({
            content: { key: "value" },
            expiresAt: CoreDate.utc().add({ minutes: 10 }).toISOString(),
            ephemeral: true,
            passwordProtection: { password: "password", passwordLocationIndicator: "invalid-password-location-indicator" }
        });
        expect(createResult).toBeAnError(
            "must be a number between 0 and 99 or one of the following strings: RecoveryKit, Self, Letter, RegistrationLetter, Mail, Sms, App, Website",
            "error.runtime.validation.invalidPropertyValue"
        );
    });

    describe("LoadItemFromTruncatedReferenceUseCase", () => {
        test("send and receive a password-protected token", async () => {
            const token = await uploadOwnToken(runtimeServices1.transport, undefined, { password: "password" });

            const loadResult = await runtimeServices2.transport.account.loadItemFromTruncatedReference({ reference: token.truncatedReference, password: "password" });
            expect(loadResult).toBeSuccessful();
            expect(loadResult.value.type).toBe("Token");
        });

        test("error when loading a token with a wrong password", async () => {
            const token = await uploadOwnToken(runtimeServices1.transport, undefined, { password: "password" });

            const loadResult = await runtimeServices2.transport.account.loadItemFromTruncatedReference({ reference: token.truncatedReference, password: "wrong-password" });
            expect(loadResult).toBeAnError(/.*/, "error.runtime.recordNotFound");
        });

        test("error when loading a token with no password", async () => {
            const token = await uploadOwnToken(runtimeServices1.transport, undefined, { password: "password" });

            const loadResult = await runtimeServices2.transport.account.loadItemFromTruncatedReference({ reference: token.truncatedReference });
            expect(loadResult).toBeAnError(/.*/, "error.transport.noPasswordProvided");
        });
    });
});
