import { DeviceMapper } from "@nmshd/runtime";
import { DeviceSharedSecret } from "@nmshd/transport";
import { AppRuntime, AppRuntimeServices } from "../../src";
import { TestUtil } from "../lib";

describe("Onboarding", function () {
    let runtime: AppRuntime;
    let runtime2: AppRuntime;
    let runtime3: AppRuntime;

    let services1: AppRuntimeServices;

    beforeAll(async function () {
        runtime = await TestUtil.createRuntime();
        await runtime.start();

        const [localAccount1] = await TestUtil.provideAccounts(runtime, 1);
        services1 = await runtime.getServices(localAccount1.id);

        runtime2 = await TestUtil.createRuntime();
        await runtime2.start();

        runtime3 = await TestUtil.createRuntime();
        await runtime3.start();
    });

    afterAll(async function () {
        await runtime.stop();
        await runtime2.stop();
    });

    test("should throw when onboarding a second account with the same address", async function () {
        const createDeviceResult = await services1.transportServices.devices.createDevice({});
        const onboardingInfoResult = await services1.transportServices.devices.getDeviceOnboardingInfo({ id: createDeviceResult.value.id });

        await expect(() => runtime.accountServices.onboardAccount(onboardingInfoResult.value)).rejects.toThrow("error.app-runtime.onboardedAccountAlreadyExists");
    });

    test("should onboard with a recovery kit and meanwhile delete the token", async () => {
        const recoveryKitResponse = await services1.transportServices.identityRecoveryKits.createIdentityRecoveryKit({
            profileName: "profileName",
            passwordProtection: { password: "aPassword" }
        });

        const token = await runtime2.anonymousServices.tokens.loadPeerToken({ reference: recoveryKitResponse.value.truncatedReference, password: "aPassword" });
        const deviceOnboardingDTO = DeviceMapper.toDeviceOnboardingInfoDTO(DeviceSharedSecret.from(token.value.content.sharedSecret));

        const result = await runtime2.accountServices.onboardAccount(deviceOnboardingDTO);
        expect(result.address!).toBe((await services1.transportServices.account.getIdentityInfo()).value.address);

        const anonymousTokenResponse = await runtime2.anonymousServices.tokens.loadPeerToken({ reference: recoveryKitResponse.value.truncatedReference, password: "aPassword" });
        expect(anonymousTokenResponse).toBeAnError(
            "Token not found. Make sure the ID exists and the record is not expired. If a password is required to fetch the record, make sure you passed the correct one.",
            "error.runtime.recordNotFound"
        );

        await services1.transportServices.account.syncDatawallet();
    });

    test("should onboard with a recovery kit and be able to create a new recovery kit", async () => {
        const recoveryKitResponse = await services1.transportServices.identityRecoveryKits.createIdentityRecoveryKit({
            profileName: "profileName",
            passwordProtection: { password: "aPassword" }
        });

        const token = await runtime3.anonymousServices.tokens.loadPeerToken({ reference: recoveryKitResponse.value.truncatedReference, password: "aPassword" });
        const deviceOnboardingDTO = DeviceMapper.toDeviceOnboardingInfoDTO(DeviceSharedSecret.from(token.value.content.sharedSecret));

        const result = await runtime3.accountServices.onboardAccount(deviceOnboardingDTO);
        expect(result.address!).toBe((await services1.transportServices.account.getIdentityInfo()).value.address);

        const services2 = await runtime3.getServices(result.id);

        await services1.transportServices.account.syncDatawallet();
        const devices = (await services1.transportServices.devices.getDevices()).value;
        const backupDevices = devices.filter((device) => device.isBackupDevice);
        expect(backupDevices).toHaveLength(0);

        const recoveryKitResponse2 = await services2.transportServices.identityRecoveryKits.createIdentityRecoveryKit({
            profileName: "profileName",
            passwordProtection: { password: "aPassword" }
        });
        expect(recoveryKitResponse2).toBeSuccessful();
    });
});
