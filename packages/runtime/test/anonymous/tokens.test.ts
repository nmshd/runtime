import { NoLoginTestRuntime, RuntimeServiceProvider, TestRuntime, TestRuntimeServices, uploadOwnToken } from "../lib";

const serviceProvider = new RuntimeServiceProvider();
let noLoginRuntime: TestRuntime;
let runtimeService: TestRuntimeServices;

beforeAll(async () => {
    runtimeService = (await serviceProvider.launch(1))[0];

    noLoginRuntime = new NoLoginTestRuntime(RuntimeServiceProvider.defaultConfig);
    await noLoginRuntime.init();
    await noLoginRuntime.start();
}, 30000);
afterAll(async () => {
    await serviceProvider.stop();
    await noLoginRuntime.stop();
});

describe("Anonymous tokens", () => {
    test("should load the token anonymous by truncated reference", async () => {
        const uploadedToken = await uploadOwnToken(runtimeService.transport);
        const result = await noLoginRuntime.anonymousServices.tokens.loadPeerToken({
            reference: uploadedToken.truncatedReference
        });
        expect(result).toBeSuccessful();

        const token = result.value;
        expect(token.content).toStrictEqual(uploadedToken.content);
    });

    test("should load the token anonymous by url reference", async () => {
        const uploadedToken = await uploadOwnToken(runtimeService.transport);
        const result = await noLoginRuntime.anonymousServices.tokens.loadPeerToken({
            reference: uploadedToken.reference.url
        });
        expect(result).toBeSuccessful();

        const token = result.value;
        expect(token.content).toStrictEqual(uploadedToken.content);
    });

    test("should catch a personalized token", async () => {
        const uploadedPersonalizedToken = await uploadOwnToken(runtimeService.transport, runtimeService.address);
        const result = await noLoginRuntime.anonymousServices.tokens.loadPeerToken({
            reference: uploadedPersonalizedToken.truncatedReference
        });
        expect(result).toBeAnError(/.*/, "error.transport.general.notIntendedForYou");
    });

    describe("Password-protected tokens", () => {
        let tokenReference: string;

        beforeAll(async () => {
            tokenReference = (await uploadOwnToken(runtimeService.transport, undefined, { password: "password" })).truncatedReference;
        });

        test("send and receive a password-protected token", async () => {
            const result = await noLoginRuntime.anonymousServices.tokens.loadPeerToken({
                reference: tokenReference,
                password: "password"
            });
            expect(result).toBeSuccessful();
            expect(result.value.passwordProtection?.password).toBe("password");
            expect(result.value.passwordProtection?.passwordIsPin).toBeUndefined();
        });

        test("error when loading a token with a wrong password", async () => {
            const result = await noLoginRuntime.anonymousServices.tokens.loadPeerToken({
                reference: tokenReference,
                password: "wrong-password"
            });
            expect(result).toBeAnError(/.*/, "error.runtime.recordNotFound");
        });

        test("error when loading a token with a missing password", async () => {
            const result = await noLoginRuntime.anonymousServices.tokens.loadPeerToken({
                reference: tokenReference
            });
            expect(result).toBeAnError(/.*/, "error.transport.noPasswordProvided");
        });
    });
});
