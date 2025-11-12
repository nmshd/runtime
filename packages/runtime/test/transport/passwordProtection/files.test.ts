import { RuntimeServiceProvider, TestRuntimeServices, uploadFile } from "../../lib/index.js";

const serviceProvider = new RuntimeServiceProvider();
let runtimeServices1: TestRuntimeServices;
let runtimeServices2: TestRuntimeServices;

beforeAll(async () => {
    const runtimeServices = await serviceProvider.launch(2);
    runtimeServices1 = runtimeServices[0];
    runtimeServices2 = runtimeServices[1];
}, 30000);
afterAll(() => serviceProvider.stop());

describe("Password-protected tokens for files", () => {
    let fileId: string;

    beforeAll(async () => {
        fileId = (await uploadFile(runtimeServices1.transport)).id;
    });

    test("send and receive a file via password-protected token", async () => {
        const createResult = await runtimeServices1.transport.files.createTokenForFile({
            fileId,
            passwordProtection: { password: "password" }
        });
        expect(createResult).toBeSuccessful();
        expect(createResult.value.passwordProtection?.password).toBe("password");
        expect(createResult.value.passwordProtection?.passwordIsPin).toBeUndefined();

        const loadResult = await runtimeServices2.transport.files.getOrLoadFile({ reference: createResult.value.reference.truncated, password: "password" });
        expect(loadResult).toBeSuccessful();
    });

    test("send and receive a file via PIN-protected token", async () => {
        const createResult = await runtimeServices1.transport.files.createTokenForFile({
            fileId,
            passwordProtection: { password: "1234", passwordIsPin: true }
        });
        expect(createResult).toBeSuccessful();
        expect(createResult.value.passwordProtection?.password).toBe("1234");
        expect(createResult.value.passwordProtection?.passwordIsPin).toBe(true);

        const loadResult = await runtimeServices2.transport.files.getOrLoadFile({ reference: createResult.value.reference.truncated, password: "1234" });
        expect(loadResult).toBeSuccessful();
    });

    test("send a file via token with passwordLocationIndicator", async () => {
        const createResult = await runtimeServices1.transport.files.createTokenForFile({
            fileId,
            passwordProtection: { password: "password", passwordLocationIndicator: 50 }
        });
        expect(createResult).toBeSuccessful();
        expect(createResult.value.passwordProtection!.passwordLocationIndicator).toBe(50);
    });

    test("error when loading the file with a wrong password", async () => {
        const createResult = await runtimeServices1.transport.files.createTokenForFile({
            fileId,
            passwordProtection: { password: "password" }
        });
        expect(createResult).toBeSuccessful();

        const loadResult = await runtimeServices2.transport.files.getOrLoadFile({ reference: createResult.value.reference.truncated, password: "wrong-password" });
        expect(loadResult).toBeAnError(/.*/, "error.runtime.recordNotFound");
    });

    test("error when loading the file with no password", async () => {
        const createResult = await runtimeServices1.transport.files.createTokenForFile({
            fileId,
            passwordProtection: { password: "password" }
        });
        expect(createResult).toBeSuccessful();

        const loadResult = await runtimeServices2.transport.files.getOrLoadFile({ reference: createResult.value.reference.truncated });
        expect(loadResult).toBeAnError(/.*/, "error.transport.noPasswordProvided");
    });

    test("validation error when creating a token with empty string as the password", async () => {
        const createResult = await runtimeServices1.transport.files.createTokenForFile({
            fileId,
            passwordProtection: { password: "" }
        });
        expect(createResult).toBeAnError("password must NOT have fewer than 1 characters", "error.runtime.validation.invalidPropertyValue");
    });

    test("validation error when creating a token with an invalid PIN", async () => {
        const createResult = await runtimeServices1.transport.files.createTokenForFile({
            fileId,
            passwordProtection: { password: "invalid-pin", passwordIsPin: true }
        });
        expect(createResult).toBeAnError(
            "'passwordProtection.passwordIsPin' is true, hence 'passwordProtection.password' must consist of 4 to 16 digits from 0 to 9.",
            "error.runtime.validation.invalidPropertyValue"
        );
    });

    test("validation error when creating a token with a PasswordLocationIndicator that is an invalid string", async () => {
        const createResult = await runtimeServices1.transport.files.createTokenForFile({
            fileId,
            passwordProtection: { password: "password", passwordLocationIndicator: "invalid-password-location-indicator" as any }
        });
        expect(createResult).toBeAnError(
            /^must be a number from 50 to 99 or one of the following strings: Self, Letter, RegistrationLetter, Email, SMS, Website$/,
            "error.runtime.validation.invalidPropertyValue"
        );
    });

    test("validation error when creating a token with a PasswordLocationIndicator that is an invalid number", async () => {
        const createResult = await runtimeServices1.transport.files.createTokenForFile({
            fileId,
            passwordProtection: { password: "password", passwordLocationIndicator: 1000 as any }
        });
        expect(createResult).toBeAnError(
            "must be a number from 50 to 99 or one of the following strings: Self, Letter, RegistrationLetter, Email, SMS, Website",
            "error.runtime.validation.invalidPropertyValue"
        );
    });

    test("validation error when creating a token with a PasswordLocationIndicator that is a number mapping to a PasswordLocationIndicatorOption", async () => {
        const createResult = await runtimeServices1.transport.files.createTokenForFile({
            fileId,
            passwordProtection: { password: "password", passwordLocationIndicator: 1 as any }
        });
        expect(createResult).toBeAnError(
            "must be a number from 50 to 99 or one of the following strings: Self, Letter, RegistrationLetter, Email, SMS, Website",
            "error.runtime.validation.invalidPropertyValue"
        );
    });

    test("validation error when creating a token with a PasswordLocationIndicator that is a number mapping to a RecoveryKit", async () => {
        const createResult = await runtimeServices1.transport.files.createTokenForFile({
            fileId,
            passwordProtection: { password: "password", passwordLocationIndicator: 1 as any }
        });
        expect(createResult).toBeAnError(
            "must be a number from 50 to 99 or one of the following strings: Self, Letter, RegistrationLetter, Email, SMS, Website",
            "error.runtime.validation.invalidPropertyValue"
        );
    });

    describe("LoadItemFromReferenceUseCase", () => {
        test("send and receive a file via password-protected token", async () => {
            const createResult = await runtimeServices1.transport.files.createTokenForFile({
                fileId,
                passwordProtection: { password: "password" }
            });
            const loadResult = await runtimeServices2.transport.account.loadItemFromReference({ reference: createResult.value.reference.truncated, password: "password" });
            expect(loadResult).toBeSuccessful();
            expect(loadResult.value.type).toBe("File");
        });

        test("error when loading the file with a wrong password", async () => {
            const createResult = await runtimeServices1.transport.files.createTokenForFile({
                fileId,
                passwordProtection: { password: "password" }
            });
            const loadResult = await runtimeServices2.transport.account.loadItemFromReference({
                reference: createResult.value.reference.truncated,
                password: "wrong-password"
            });
            expect(loadResult).toBeAnError(/.*/, "error.runtime.recordNotFound");
        });

        test("error when loading the file with no password", async () => {
            const createResult = await runtimeServices1.transport.files.createTokenForFile({
                fileId,
                passwordProtection: { password: "password" }
            });
            const loadResult = await runtimeServices2.transport.account.loadItemFromReference({ reference: createResult.value.reference.truncated });
            expect(loadResult).toBeAnError(/.*/, "error.transport.noPasswordProvided");
        });
    });
});
