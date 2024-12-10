import { RuntimeServiceProvider, TestRuntimeServices } from "../lib";

const serviceProvider = new RuntimeServiceProvider();

let services: TestRuntimeServices;
let servicesWithDisabledDatawallet: TestRuntimeServices;

beforeAll(async () => {
    const runtimeServices = await serviceProvider.launch(1, { enableDatawallet: true });
    services = runtimeServices[0];

    const datawalletDisbledServices = await serviceProvider.launch(1, { enableDatawallet: false });
    servicesWithDisabledDatawallet = datawalletDisbledServices[0];
}, 30000);

afterAll(async () => await serviceProvider.stop());

describe("Identity Recovery Kits", () => {
    describe("errors", () => {
        test("should not be possible to create a recovery kit when the datawallet is disabled", async () => {
            const response = await servicesWithDisabledDatawallet.transport.identityRecoveryKits.createIdentityRecoveryKit({
                profileName: "profileName",
                passwordProtection: { password: "password" }
            });
            expect(response).toBeAnError("Datawallet is disabled. Recovery kits can only be created when datawallet is enabled.", "error.runtime.recoveryKit.datawalletDisabled");
        });

        test.each([
            [{ password: "" }, "passwordProtection/password must NOT have fewer than 1 characters"],
            [
                { password: "aPassword", passwordIsPin: true },
                "'passwordProtection.passwordIsPin' is true, hence 'passwordProtection.password' must consist of 4 to 16 digits from 0 to 9."
            ],
            [
                { password: "123", passwordIsPin: true },
                "'passwordProtection.passwordIsPin' is true, hence 'passwordProtection.password' must consist of 4 to 16 digits from 0 to 9."
            ],
            [
                { password: "123456789123456789123456789123456789", passwordIsPin: true },
                "'passwordProtection.passwordIsPin' is true, hence 'passwordProtection.password' must consist of 4 to 16 digits from 0 to 9."
            ],
            [{ password: 123, passwordIsPin: true }, "passwordProtection/password must be string"]
        ])("should reject the invalid password protection '%p'", async (passwordProtection: any, errorMessage) => {
            const response = await services.transport.identityRecoveryKits.createIdentityRecoveryKit({ profileName: "profileName", passwordProtection });
            expect(response).toBeAnError(errorMessage, "error.runtime.validation.invalidPropertyValue");
        });
    });
});
