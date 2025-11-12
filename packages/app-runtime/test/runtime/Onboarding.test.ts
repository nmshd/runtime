import { AppRuntime } from "@nmshd/app-runtime";
import { DeviceMapper, RuntimeServices } from "@nmshd/runtime";
import { DeviceSharedSecret, ITokenContentDeviceSharedSecret, TokenContentDeviceSharedSecret } from "@nmshd/transport";
import { TestUtil } from "../lib/index.js";

describe("Onboarding", function () {
    let runtimeWithExistingAccount: AppRuntime;
    let services: RuntimeServices;

    let onboardingRuntime: AppRuntime;

    beforeAll(async function () {
        runtimeWithExistingAccount = await TestUtil.createRuntime();
        await runtimeWithExistingAccount.start();

        const [localAccount1] = await TestUtil.provideAccounts(runtimeWithExistingAccount, 1);
        services = await runtimeWithExistingAccount.getServices(localAccount1.id);
    });

    afterAll(async () => await runtimeWithExistingAccount.stop());

    beforeEach(async function () {
        onboardingRuntime = await TestUtil.createRuntime();
        await onboardingRuntime.start();
    });

    afterEach(async () => await onboardingRuntime.stop());

    test("should throw when onboarding a second account with the same address", async function () {
        const emptyToken = await onboardingRuntime.anonymousServices.tokens.createEmptyToken();
        const fillResult = await services.transportServices.devices.fillDeviceOnboardingTokenWithNewDevice({ reference: emptyToken.value.reference.truncated });
        const deviceOnboardingDTO = DeviceMapper.toDeviceOnboardingInfoDTO(TokenContentDeviceSharedSecret.from(fillResult.value.content).sharedSecret);

        await expect(() => runtimeWithExistingAccount.accountServices.onboardAccount(deviceOnboardingDTO)).rejects.toThrow("error.app-runtime.onboardedAccountAlreadyExists");
    });

    test("should onboard with a recovery kit and meanwhile delete the token", async () => {
        const recoveryKitResponse = await services.transportServices.identityRecoveryKits.createIdentityRecoveryKit({
            profileName: "profileName",
            passwordProtection: { password: "aPassword" }
        });

        const token = await onboardingRuntime.anonymousServices.tokens.loadPeerToken({ reference: recoveryKitResponse.value.reference.truncated, password: "aPassword" });
        const deviceOnboardingDTO = DeviceMapper.toDeviceOnboardingInfoDTO(DeviceSharedSecret.from(token.value.content.sharedSecret));

        const result = await onboardingRuntime.accountServices.onboardAccount(deviceOnboardingDTO);
        expect(result.address!).toBe((await services.transportServices.account.getIdentityInfo()).value.address);

        const anonymousTokenResponse = await onboardingRuntime.anonymousServices.tokens.loadPeerToken({
            reference: recoveryKitResponse.value.reference.truncated,
            password: "aPassword"
        });
        expect(anonymousTokenResponse).toBeAnError(
            "Token not found. Make sure the ID exists and the record is not expired. If a password is required to fetch the record, make sure you passed the correct one.",
            "error.runtime.recordNotFound"
        );

        await services.transportServices.account.syncDatawallet();
    });

    test("should onboard with a recovery kit and be able to create a new recovery kit", async () => {
        const recoveryKitResponse = await services.transportServices.identityRecoveryKits.createIdentityRecoveryKit({
            profileName: "profileName",
            passwordProtection: { password: "aPassword" }
        });

        const token = await onboardingRuntime.anonymousServices.tokens.loadPeerToken({ reference: recoveryKitResponse.value.reference.truncated, password: "aPassword" });
        const deviceOnboardingDTO = DeviceMapper.toDeviceOnboardingInfoDTO(DeviceSharedSecret.from(token.value.content.sharedSecret));

        const result = await onboardingRuntime.accountServices.onboardAccount(deviceOnboardingDTO);
        expect(result.address).toBe((await services.transportServices.account.getIdentityInfo()).value.address);

        const services2 = await onboardingRuntime.getServices(result.id);

        await services.transportServices.account.syncDatawallet();
        const devices = (await services.transportServices.devices.getDevices()).value;
        const backupDevices = devices.filter((device) => device.isBackupDevice);
        expect(backupDevices).toHaveLength(0);

        const recoveryKitResponse2 = await services2.transportServices.identityRecoveryKits.createIdentityRecoveryKit({
            profileName: "profileName",
            passwordProtection: { password: "aPassword" }
        });
        expect(recoveryKitResponse2).toBeSuccessful();
    });

    test("should onboard with an anonymously created empty token", async () => {
        const emptyToken = await onboardingRuntime.anonymousServices.tokens.createEmptyToken();

        const result = await services.transportServices.devices.fillDeviceOnboardingTokenWithNewDevice({ reference: emptyToken.value.reference.truncated });
        expect(result).toBeSuccessful();

        const token = await onboardingRuntime.anonymousServices.tokens.loadPeerToken({ reference: emptyToken.value.reference.truncated });
        expect(token.value.content["@type"]).toBe("TokenContentDeviceSharedSecret");

        const content = token.value.content as ITokenContentDeviceSharedSecret;
        const deviceOnboardingDTO = DeviceMapper.toDeviceOnboardingInfoDTO(TokenContentDeviceSharedSecret.from(content).sharedSecret);

        const onboardResult = await onboardingRuntime.accountServices.onboardAccount(deviceOnboardingDTO);
        expect(onboardResult.address).toBe((await services.transportServices.account.getIdentityInfo()).value.address);
    });

    test("should store the device name during onboarding", async function () {
        const emptyToken = await onboardingRuntime.anonymousServices.tokens.createEmptyToken();
        const fillResult = await services.transportServices.devices.fillDeviceOnboardingTokenWithNewDevice({ reference: emptyToken.value.reference.truncated });
        const deviceOnboardingDTO = DeviceMapper.toDeviceOnboardingInfoDTO(TokenContentDeviceSharedSecret.from(fillResult.value.content).sharedSecret);

        const result = await onboardingRuntime.accountServices.onboardAccount(deviceOnboardingDTO, undefined, "aDeviceName");
        expect(result.address).toBe((await services.transportServices.account.getIdentityInfo()).value.address);

        const services2 = await onboardingRuntime.getServices(result.id);
        const devicesResult = await services2.transportServices.devices.getDevices();
        const devices = devicesResult.value;
        expect(devices.find((d) => d.isCurrentDevice)!.name).toBe("aDeviceName");

        await services.transportServices.account.syncDatawallet();
        const devicesAfterSync = (await services.transportServices.devices.getDevices()).value;
        expect(devicesAfterSync.find((d) => d.id === deviceOnboardingDTO.id)!.name).toBe("aDeviceName");
    });
});
