import { DeviceMapper, RuntimeServices } from "@nmshd/runtime";
import { DeviceSharedSecret, ITokenContentDeviceSharedSecret, TokenContentDeviceSharedSecret } from "@nmshd/transport";
import { AppRuntime } from "../../src";
import { TestUtil } from "../lib";

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
        const createDeviceResult = await services.transportServices.devices.createDevice({});
        const onboardingInfoResult = await services.transportServices.devices.getDeviceOnboardingInfo({ id: createDeviceResult.value.id });

        await expect(() => runtimeWithExistingAccount.accountServices.onboardAccount(onboardingInfoResult.value)).rejects.toThrow(
            "error.app-runtime.onboardedAccountAlreadyExists"
        );
    });

    test("should onboard with a recovery kit and meanwhile delete the token", async () => {
        const recoveryKitResponse = await services.transportServices.identityRecoveryKits.createIdentityRecoveryKit({
            profileName: "profileName",
            passwordProtection: { password: "aPassword" }
        });

        const token = await onboardingRuntime.anonymousServices.tokens.loadPeerToken({ reference: recoveryKitResponse.value.truncatedReference, password: "aPassword" });
        const deviceOnboardingDTO = DeviceMapper.toDeviceOnboardingInfoDTO(DeviceSharedSecret.from(token.value.content.sharedSecret));

        const result = await onboardingRuntime.accountServices.onboardAccount(deviceOnboardingDTO);
        expect(result.address!).toBe((await services.transportServices.account.getIdentityInfo()).value.address);

        const anonymousTokenResponse = await onboardingRuntime.anonymousServices.tokens.loadPeerToken({
            reference: recoveryKitResponse.value.truncatedReference,
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

        const token = await onboardingRuntime.anonymousServices.tokens.loadPeerToken({ reference: recoveryKitResponse.value.truncatedReference, password: "aPassword" });
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

        const device = await services.transportServices.devices.createDevice({});
        const onboardingInfo = await services.transportServices.devices.getDeviceOnboardingInfo({ id: device.value.id });

        const tokenContent = TokenContentDeviceSharedSecret.from({ sharedSecret: DeviceMapper.toDeviceSharedSecret(onboardingInfo.value) });
        const result = await services.transportServices.tokens.updateTokenContent({ reference: emptyToken.value.reference.truncated, content: tokenContent.toJSON() });
        expect(result).toBeSuccessful();

        const token = await onboardingRuntime.anonymousServices.tokens.loadPeerToken({ reference: emptyToken.value.reference.truncated });
        expect(token.value.content["@type"]).toBe("TokenContentDeviceSharedSecret");

        const content = token.value.content as ITokenContentDeviceSharedSecret;
        const deviceOnboardingDTO = DeviceMapper.toDeviceOnboardingInfoDTO(TokenContentDeviceSharedSecret.from(content).sharedSecret);

        const onboardResult = await onboardingRuntime.accountServices.onboardAccount(deviceOnboardingDTO);
        expect(onboardResult.address).toBe((await services.transportServices.account.getIdentityInfo()).value.address);
    });
});
