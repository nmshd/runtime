import { PasswordLocationIndicatorStrings } from "src/useCases/common";
import { OwnerRestriction } from "../../src";
import { RuntimeServiceProvider, TestRuntimeServices } from "../lib";

const serviceProvider = new RuntimeServiceProvider();

let services: TestRuntimeServices;
let servicesWithDisabledDatawallet: TestRuntimeServices;

beforeAll(async () => {
    const runtimeServices = await serviceProvider.launch(1, { enableDatawallet: true });
    services = runtimeServices[0];

    const datawalletDisabledServices = await serviceProvider.launch(1, { enableDatawallet: false });
    servicesWithDisabledDatawallet = datawalletDisabledServices[0];
}, 30000);

afterAll(async () => await serviceProvider.stop());

afterEach(async () => {
    const devicesController = services.transport.identityRecoveryKits["createIdentityRecoveryKitUseCase"]["devicesController"];
    const tokenController = services.transport.identityRecoveryKits["createIdentityRecoveryKitUseCase"]["tokenController"];

    const devices = await devicesController.list();

    const backupDevices = devices.filter((device) => device.isBackupDevice);
    for (const backupDevice of backupDevices) {
        const matchingTokens = await tokenController.getTokens({
            "cache.content.@type": "TokenContentDeviceSharedSecret",
            "cache.content.sharedSecret.id": backupDevice.id.toString()
        });

        for (const matchingToken of matchingTokens) {
            await tokenController.delete(matchingToken);
        }

        await devicesController.delete(backupDevice);
    }
});

describe("Identity Recovery Kits", () => {
    test("should create a recovery kit", async () => {
        const response = await services.transport.identityRecoveryKits.createIdentityRecoveryKit({
            profileName: "profileName",
            passwordProtection: { password: "aPassword" }
        });
        expect(response).toBeSuccessful();
        expect(response.value.passwordProtection!.passwordLocationIndicator).toBe(PasswordLocationIndicatorStrings.RecoveryKit);

        const devices = (await services.transport.devices.getDevices()).value;
        const backupDevices = devices.filter((device) => device.isBackupDevice);
        expect(backupDevices).toHaveLength(1);

        const backupDevice = backupDevices[0];

        const tokens = (await services.transport.tokens.getTokens({ ownerRestriction: OwnerRestriction.Own, query: { expiresAt: "^9999-12-31" } })).value;
        expect(tokens).toHaveLength(1);

        expect(tokens[0].content["@type"]).toBe("TokenContentDeviceSharedSecret");
        expect(tokens[0].content.sharedSecret.id).toBe(backupDevice.id.toString());
    });

    test("should delete a recovery kit and its token when creating a consecutive recovery kit", async () => {
        const firstToken = (await services.transport.identityRecoveryKits.createIdentityRecoveryKit({ profileName: "profileName", passwordProtection: { password: "aPassword" } }))
            .value;
        const firstBackupDevice = (await services.transport.devices.getDevices()).value.find((device) => device.isBackupDevice)!;

        const response = await services.transport.identityRecoveryKits.createIdentityRecoveryKit({ profileName: "profileName", passwordProtection: { password: "aPassword" } });
        expect(response).toBeSuccessful();

        const getTokenResponse = await services.transport.tokens.getToken({ id: firstToken.id });
        expect(getTokenResponse).toBeAnError("Token not found", "error.runtime.recordNotFound");

        const getDeviceResponse = await services.transport.devices.getDevice({ id: firstBackupDevice.id });
        expect(getDeviceResponse).toBeAnError("Device not found", "error.runtime.recordNotFound");
    });

    test("should tell that no recovery kit exists", async () => {
        const response = await services.transport.identityRecoveryKits.checkForExistingIdentityRecoveryKit();
        expect(response).toBeSuccessful();

        expect(response.value.exists).toBe(false);
    });

    test("should tell that a recovery kit exists", async () => {
        await services.transport.identityRecoveryKits.createIdentityRecoveryKit({ profileName: "profileName", passwordProtection: { password: "aPassword" } });

        const response = await services.transport.identityRecoveryKits.checkForExistingIdentityRecoveryKit();
        expect(response).toBeSuccessful();

        expect(response.value.exists).toBe(true);
    });

    describe("errors", () => {
        test("should not be possible to create a recovery kit when the datawallet is disabled", async () => {
            const response = await servicesWithDisabledDatawallet.transport.identityRecoveryKits.createIdentityRecoveryKit({
                profileName: "profileName",
                passwordProtection: { password: "password" }
            });
            expect(response).toBeAnError(
                "The Datawallet is disabled. IdentityRecoveryKits will only work if the Datawallet is enabled.",
                "error.runtime.identityRecoveryKits.datawalletDisabled"
            );
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
